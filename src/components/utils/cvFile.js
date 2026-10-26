// Returns ".pdf", ".docx", ".doc" or "" for a downloaded file.
export async function cvExtension(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const startsWith = (...values) => values.every((v, i) => bytes[i] === v);
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return ".pdf"; // %PDF
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) return ".docx"; // PK.. (zip based)
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0)) return ".doc";
  return "";
}

// Adds the right extension to a file name when it has none.
export async function nameWithExtension(name, blob) {
  const base = String(name || "CV").trim() || "CV";
  if (/\.(pdf|docx?)$/i.test(base)) return base;
  return `${base}${await cvExtension(blob)}`;
}
