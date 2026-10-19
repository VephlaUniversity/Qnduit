import { Buffer } from "node:buffer";
import { inflate } from "node:zlib";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { attachmentError } from "./storage.js";

export const ATTACHMENT_LIMITS = { files: 5, fileSize: 10000000, totalSize: 25000000, requestSize: 25262144 };
const inflateBounded = promisify(inflate);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
export function safeAttachmentName(value) {
  return path.basename(String(value).replaceAll('\\', '/')).replace(/[^a-zA-Z0-9 ._-]/g, '_').replace(/^\.+/, '').slice(0, 100) || 'attachment';
}
// Bounded structural format checks, not malware scanning or a full media decoder.
export async function validateAttachment(file) {
  const bytes = await readFile(file.path);
  const mime = types[path.extname(file.originalname).toLowerCase()];
  let valid = false;
  if (mime === 'image/png' && bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    let offset = 8, header = false, data = false, end = false;
    const compressed = [];
    while (offset + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
      if (size > bytes.length - offset - 12) break;
      if (crc32(bytes.subarray(offset + 4, offset + 8 + size)) !== bytes.readUInt32BE(offset + 8 + size)) break;
      if (offset === 8) header = type === 'IHDR' && size === 13 && bytes.readUInt32BE(offset + 8) > 0 && bytes.readUInt32BE(offset + 12) > 0;
      if (type === 'IDAT' && size) { data = true; compressed.push(bytes.subarray(offset + 8, offset + 8 + size)); }
      offset += size + 12;
      if (type === 'IEND') { end = size === 0 && offset === bytes.length; break; }
    }
    valid = header && data && end;
    if (valid) {
      try { await inflateBounded(Buffer.concat(compressed), { maxOutputLength: 64000000 }); }
      catch { valid = false; }
    }
  } else if (mime === 'image/jpeg' && bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let offset = 2, frame = false;
    while (offset + 4 <= bytes.length && bytes[offset] === 255) {
      const marker = bytes[offset + 1], size = bytes.readUInt16BE(offset + 2);
      if (size < 2 || offset + 2 + size > bytes.length) break;
      if ([192,193,194].includes(marker) && size >= 8) frame = bytes.readUInt16BE(offset + 5) > 0 && bytes.readUInt16BE(offset + 7) > 0;
      if (marker === 218) { valid = frame && size >= 6 && offset + size + 4 < bytes.length; break; }
      offset += size + 2;
    }
  } else if (mime === 'image/webp' && bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) === bytes.length - 8) {
    let offset = 12, image = false;
    while (offset + 8 <= bytes.length) {
      const size = bytes.readUInt32LE(offset + 4), type = bytes.toString('ascii', offset, offset + 4);
      if (size > bytes.length - offset - 8) break;
      if (type === 'VP8 ' && size >= 10) image ||= bytes.subarray(offset + 11, offset + 14).equals(Buffer.from([157,1,42]));
      if (type === 'VP8L' && size >= 5) image ||= bytes[offset + 8] === 47;
      offset += 8 + size + size % 2;
    }
    valid = image && offset === bytes.length;
  } else if (mime === 'application/pdf') {
    const text = bytes.toString('latin1');
    valid = /^%PDF-1\.[0-7](?:\r|\n)/.test(text) && /%%EOF\s*$/.test(text) && /\bstartxref\s+\d+\s+%%EOF\s*$/.test(text) && /\b\d+\s+\d+\s+obj\b/.test(text);
  }
  if (!valid) throw attachmentError('Unsupported, invalid or truncated attachment. Use JPG, PNG, WebP or PDF.');
  return { name: safeAttachmentName(file.originalname), mime, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
export const publicAttachment = file => ({ id: file.id, name: file.name, mime: file.mime, size: file.size });
export const attachmentFingerprint = files => JSON.stringify((files || []).map(file => [file.name, file.mime, file.size, file.sha256]));
