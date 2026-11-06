import { Buffer } from "node:buffer";
import { inflateRawSync, inflateSync } from "node:zlib";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 100000;
const MAX_EXPANDED = 32 * 1024 * 1024;
const MAX_SEGMENTS = 3000;
const fail = code => { throw Object.assign(new Error(code), { code }); };

function inspectZip(data) {
  if (!data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) fail("INVALID_DOCUMENT");
  let end = -1;
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65557); offset--) {
    if (data.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0 || end + 22 + data.readUInt16LE(end + 20) !== data.length) fail("INVALID_DOCUMENT");
  const count = data.readUInt16LE(end + 10), directorySize = data.readUInt32LE(end + 12);
  let cursor = data.readUInt32LE(end + 16), expanded = 0;
  if (!count || count > 200 || cursor + directorySize > end || data.readUInt16LE(end + 8) !== count) fail("RESOURCE_LIMIT");
  const names = new Set(); let documentXml;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || data.readUInt32LE(cursor) !== 0x02014b50) fail("INVALID_DOCUMENT");
    const flags = data.readUInt16LE(cursor + 8), method = data.readUInt16LE(cursor + 10);
    const compressed = data.readUInt32LE(cursor + 20), size = data.readUInt32LE(cursor + 24);
    const nameLength = data.readUInt16LE(cursor + 28), extra = data.readUInt16LE(cursor + 30), comment = data.readUInt16LE(cursor + 32);
    if (cursor + 46 + nameLength + extra + comment > end) fail("INVALID_DOCUMENT");
    const name = data.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (flags & 1 || ![0, 8].includes(method) || size === 0xffffffff || compressed === 0xffffffff
      || size > 4 * 1024 * 1024 || size > Math.max(1, compressed) * 100 || name.startsWith("/")
      || name.split("/").includes("..") || names.has(name)) fail("RESOURCE_LIMIT");
    names.add(name); expanded += size;
    if (expanded > MAX_EXPANDED) fail("RESOURCE_LIMIT");
    if (name === "word/document.xml") {
      const local = data.readUInt32LE(cursor + 42);
      if (local + 30 > data.length || data.readUInt32LE(local) !== 0x04034b50) fail("INVALID_DOCUMENT");
      const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
      if (start + compressed > data.length) fail("INVALID_DOCUMENT");
      try {
        documentXml = method === 8 ? inflateRawSync(data.subarray(start, start + compressed), { maxOutputLength: 4 * 1024 * 1024 })
          : data.subarray(start, start + compressed);
      } catch { fail("RESOURCE_LIMIT"); }
    }
    cursor += 46 + nameLength + extra + comment;
  }
  if (cursor !== data.readUInt32LE(end + 16) + directorySize) fail("INVALID_DOCUMENT");
  if (!names.has("[Content_Types].xml") || !names.has("word/document.xml")) fail("INVALID_DOCUMENT");
  if (!documentXml || /<!DOCTYPE|<!ENTITY/i.test(documentXml.toString("utf8"))) fail("INVALID_DOCUMENT");
}

let totalText = 0;
function addSegment(segments, text, location, extra = {}) {
  if (typeof text !== "string" || text.length > 2048) fail("RESOURCE_LIMIT");
  segments.push({ text, location, ...extra });
  totalText += text.length;
  if (segments.length > MAX_SEGMENTS || totalText > MAX_TEXT) fail("RESOURCE_LIMIT");
}

async function pdfSegments(data) {
  if (!data.subarray(0, 5).equals(Buffer.from("%PDF-")) || !data.subarray(-4096).includes(Buffer.from("%%EOF"))) fail("INVALID_DOCUMENT");
  // Bound decoded Flate streams before PDF.js visits page operators. PDF.js
  // remains responsible for validating PDF syntax and all other filters.
  const marker = Buffer.from("stream"), endMarker = Buffer.from("endstream");
  let cursor = 0, expanded = 0;
  while ((cursor = data.indexOf(marker, cursor)) !== -1) {
    const line = cursor + marker.length;
    if (data[line] !== 10 && data[line] !== 13) { cursor = line; continue; }
    const start = line + (data[line] === 13 && data[line + 1] === 10 ? 2 : 1);
    const end = data.indexOf(endMarker, start);
    if (end < 0) break;
    let finish = end;
    while (finish > start && (data[finish - 1] === 10 || data[finish - 1] === 13)) finish--;
    if (/\/FlateDecode\b/.test(data.subarray(Math.max(0, cursor - 512), cursor).toString("latin1"))) {
      try { expanded += inflateSync(data.subarray(start, finish), { maxOutputLength: 4 * 1024 * 1024 }).length; }
      catch (error) { if (error?.code === "ERR_BUFFER_TOO_LARGE") fail("RESOURCE_LIMIT"); }
      if (expanded > MAX_EXPANDED) fail("RESOURCE_LIMIT");
    }
    cursor = end + endMarker.length;
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const fontPath = new URL("../../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).pathname;
  const task = pdfjs.getDocument({ data: new Uint8Array(data), standardFontDataUrl: `${fontPath}/`,
    disableFontFace: true, useSystemFonts: false, isEvalSupported: false, stopAtErrors: true,
    enableXfa: false, disableAutoFetch: true, disableStream: true });
  const segments = []; let omittedPages = 0, layoutOmissions = 0;
  try {
    const document = await task.promise;
    if (document.numPages < 1 || document.numPages > 50) fail("RESOURCE_LIMIT");
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const operators = await page.getOperatorList();
      let matrix = [1, 0, 0, 1, 0, 0], fullPageImage = false;
      const saved = [];
      for (let index = 0; index < operators.fnArray.length; index++) {
        const operation = operators.fnArray[index];
        if (operation === pdfjs.OPS.save) saved.push(matrix.slice());
        else if (operation === pdfjs.OPS.restore) matrix = saved.pop() || [1, 0, 0, 1, 0, 0];
        else if (operation === pdfjs.OPS.transform) {
          const [a, b, c, d, e, f] = operators.argsArray[index], [u, v, w, x, y, z] = matrix;
          matrix = [u * a + w * b, v * a + x * b, u * c + w * d, v * c + x * d,
            u * e + w * f + y, v * e + x * f + z];
        } else if ([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintJpegXObject].includes(operation)) {
          if (Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]) >= viewport.width * viewport.height * 0.8) fullPageImage = true;
        }
      }
      if (fullPageImage) {
        omittedPages++; addSegment(segments, "", `Page ${number} omitted`, { omitted: true }); continue;
      }
      const content = await page.getTextContent({ disableNormalization: false });
      const items = content.items.filter(item => typeof item.str === "string" && item.str.trim()).map(item => ({
        text: item.str, x: item.transform[4], y: item.transform[5], width: item.width,
      })).filter(item => Number.isFinite(item.x) && Number.isFinite(item.y)
        && !(item.y < viewport.height * 0.05 && item.x > viewport.width * 0.85 && /^\d{1,3}$/.test(item.text.trim())));
      if (!items.length) {
        omittedPages++; addSegment(segments, "", `Page ${number} omitted`, { omitted: true }); continue;
      }
      const rows = [];
      for (const item of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
        let row = rows.find(value => Math.abs(value.y - item.y) <= 2);
        if (!row) { row = { y: item.y, items: [] }; rows.push(row); }
        row.items.push(item);
      }
      rows.sort((a, b) => b.y - a.y);
      const pairedStarts = new Map();
      for (const row of rows) {
        for (const left of row.items.filter(item => item.x < viewport.width * 0.25)) {
          for (const right of row.items.filter(item => item.x > viewport.width * 0.5 && item.x - left.x > viewport.width * 0.35)) {
            const key = `${Math.round(left.x / 8)}:${Math.round(right.x / 8)}`;
            pairedStarts.set(key, (pairedStarts.get(key) || 0) + 1);
          }
        }
      }
      if ([...pairedStarts.values()].some(count => count >= 3)) {
        omittedPages++; layoutOmissions++; addSegment(segments, "", `Page ${number} omitted`, { omitted: true }); continue;
      }
      for (const [index, row] of rows.entries()) {
        const ordered = row.items.sort((a, b) => a.x - b.x);
        let text = "", end = -Infinity;
        for (const item of ordered) {
          const gap = item.x - end;
          text += text && gap > 9 ? "   " : text && gap > 1 ? " " : "";
          text += item.text;
          end = Math.max(end, item.x + item.width);
        }
        addSegment(segments, text.trim(), `Page ${number}, extracted line ${index + 1}`,
          { page: number, x: Math.round(ordered[0].x), y: Math.round(row.y) });
      }
    }
  } catch (error) {
    if (error?.name === "PasswordException") fail("ENCRYPTED_PDF");
    throw error;
  } finally { await task.destroy(); }
  if (!segments.some(value => value.text.trim())) fail(layoutOmissions ? "UNSUPPORTED_LAYOUT" : "SCANNED_PDF");
  return { segments, omittedPages };
}

async function docxSegments(data) {
  inspectZip(data);
  const mammoth = await import("mammoth");
  const result = await mammoth.default.extractRawText({ buffer: data });
  const paragraphs = result.value.split(/\n\n/);
  const segments = [];
  paragraphs.forEach((text, index) => addSegment(segments, text.trim(), `Paragraph ${index + 1}`));
  return { segments, omittedPages: 0 };
}

async function main() {
  const chunks = []; let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_BYTES) fail("RESOURCE_LIMIT");
    chunks.push(chunk);
  }
  if (!size) fail("INVALID_DOCUMENT");
  const data = Buffer.concat(chunks, size);
  try {
    return process.argv[2] === "pdf" ? await pdfSegments(data)
      : process.argv[2] === "docx" ? await docxSegments(data) : fail("UNSUPPORTED_FORMAT");
  } finally { data.fill(0); }
}

try { process.stdout.write(JSON.stringify(await main())); }
catch (error) { process.stdout.write(JSON.stringify({ error: ["RESOURCE_LIMIT", "INVALID_DOCUMENT", "SCANNED_PDF", "ENCRYPTED_PDF", "UNSUPPORTED_LAYOUT", "UNSUPPORTED_FORMAT"].includes(error.code) ? error.code : "INVALID_DOCUMENT" })); }
