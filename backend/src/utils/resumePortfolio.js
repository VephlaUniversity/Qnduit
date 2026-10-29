import { createHash } from "node:crypto";
import { portfolioMetadata } from "./portfolioMetadata.js";

const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

// Normalize only in memory on read. Id-less legacy rows get repeatable, owner-scoped
// identities; ordinary saving persists them. No array-position metadata matching.
export function normalizePortfolioImages(rows, ownerId) {
  const occurrences = new Map();
  return (rows || []).map(value => {
    const row = typeof value === "string" ? { url: value } : value;
    const seed = JSON.stringify([String(ownerId), row?.url || "", row?.public_id || ""]);
    const occurrence = occurrences.get(seed) || 0;
    occurrences.set(seed, occurrence + 1);
    return { ...row, _id: row?._id || createHash("sha256").update(`${seed}:${occurrence}`).digest("hex").slice(0, 24) };
  });
}

export function preparePortfolio(body, stored, files) {
  const byId = new Map();
  for (const item of stored) {
    const id = String(item._id);
    if (byId.has(id)) {
      throw invalid("Saved Resume portfolio items have duplicate identities and need review. No changes were saved; your draft is retained.");
    }
    byId.set(id, item);
  }
  let manifest;
  if (body.portfolioItems !== undefined) {
    try { manifest = typeof body.portfolioItems === "string" ? JSON.parse(body.portfolioItems) : body.portfolioItems; }
    catch { throw invalid("Invalid portfolio items."); }
    if (!Array.isArray(manifest)) throw invalid("Invalid portfolio items.");
  } else {
    // Older clients retain assets by Cloudinary ID and have no metadata fields.
    let keep;
    if (body.keepPortfolioIds !== undefined) {
      try { keep = typeof body.keepPortfolioIds === "string" ? JSON.parse(body.keepPortfolioIds) : body.keepPortfolioIds; }
      catch { throw invalid("Invalid retained portfolio IDs."); }
      if (!Array.isArray(keep) || keep.some(id => typeof id !== "string")
        || new Set(keep).size !== keep.length
        || keep.some(id => !stored.some(item => item.public_id === id))) {
        throw invalid("Invalid retained portfolio IDs.");
      }
    }
    // Id-less legacy images cannot be addressed by the older public_id protocol.
    manifest = stored.filter(item => !keep || !item.public_id || keep.includes(item.public_id))
      .map(item => ({ id: String(item._id) }));
    manifest.push(...files.map(file => ({ upload: file.originalname })));
  }
  if (manifest.length > 10) throw invalid("You can keep up to 10 portfolio images.");
  const uploads = new Map();
  for (const file of files) {
    if (uploads.has(file.originalname)) throw invalid("Duplicate portfolio upload reference.");
    if (file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g)$/i.test(file.originalname)
      || !["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype)) {
      throw invalid("Portfolio images must be PNG or JPG, up to 5MB each.");
    }
    uploads.set(file.originalname, file);
  }
  const usedIds = new Set(), usedUploads = new Set();
  const items = manifest.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)
      || Object.keys(row).some(key => !["id", "upload", "description", "projectUrl", "skills"].includes(key))
      || (Object.hasOwn(row, "id") === Object.hasOwn(row, "upload"))) {
      throw invalid("Invalid portfolio item reference.");
    }
    let previous;
    if (Object.hasOwn(row, "id")) {
      if (typeof row.id !== "string" || !byId.has(row.id) || usedIds.has(row.id)) {
        throw invalid("Portfolio item does not belong to this resume or is duplicated.");
      }
      usedIds.add(row.id);
      previous = byId.get(row.id);
    } else {
      if (typeof row.upload !== "string" || !uploads.has(row.upload) || usedUploads.has(row.upload)) {
        throw invalid("Invalid portfolio upload reference.");
      }
      usedUploads.add(row.upload);
    }
    // Omission preserves stored metadata; explicit empty values clear it.
    const metadata = Object.fromEntries(["description", "projectUrl", "skills"].map(key =>
      [key, Object.hasOwn(row, key) ? row[key] : previous?.[key]]));
    try { return { previous, file: uploads.get(row.upload), metadata: portfolioMetadata(metadata) }; }
    catch (error) { throw invalid(error.message); }
  });
  if (usedUploads.size !== files.length) throw invalid("Every portfolio upload must reference one project.");
  const removed = stored.filter(item => !usedIds.has(String(item._id)));
  return { items, removed };
}
