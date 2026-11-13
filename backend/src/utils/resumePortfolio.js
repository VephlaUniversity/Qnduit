import { createHash } from "node:crypto";
import { PORTFOLIO_METADATA_FIELDS } from "./portfolioMetadata.js";
import { finishPortfolioUploads, portfolioUploads, preparePortfolioProject } from "./portfolioGallery.js";

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

export function preparePortfolio(body, stored, files, sharedUploads) {
  const context = sharedUploads || portfolioUploads(files);
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
    manifest.push(...files.filter(file => !context.used.has(file.originalname))
      .map(file => ({ upload: file.originalname })));
  }
  // The combined Talent + Resume allowance is enforced by the save policy.
  // A fixed image cap here would prevent retaining pre-existing over-limit rows.
  const uploads = context.uploads;
  const usedIds = new Set(), newProjects = new Set();
  const items = manifest.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)
      || Object.keys(row).some(key => !["id", "upload", "newProject", ...PORTFOLIO_METADATA_FIELDS].includes(key))
      || ["id", "upload", "newProject"].filter(key => Object.hasOwn(row, key)).length !== 1) {
      throw invalid("Invalid portfolio item reference.");
    }
    let previous;
    if (Object.hasOwn(row, "id")) {
      if (typeof row.id !== "string" || !byId.has(row.id) || usedIds.has(row.id)) {
        throw invalid("Portfolio item does not belong to this resume or is duplicated.");
      }
      usedIds.add(row.id);
      previous = byId.get(row.id);
    } else if (Object.hasOwn(row, "upload")) {
      if (typeof row.upload !== "string" || !uploads.has(row.upload)) {
        throw invalid("Invalid portfolio upload reference.");
      }
    } else {
      if (typeof row.newProject !== "string" || !/^[\w-]{1,100}$/.test(row.newProject) || newProjects.has(row.newProject)) throw invalid("Invalid new project reference.");
      newProjects.add(row.newProject);
    }
    try {
      const { project, metadata } = preparePortfolioProject(row, previous, context, row.upload);
      if (!previous && !metadata.title) throw new Error("Enter a project title.");
      return { previous, file: uploads.get(row.upload), metadata, project };
    }
    catch (error) { throw invalid(error.message); }
  });
  if (!sharedUploads) finishPortfolioUploads(context);
  const removed = stored.filter(item => !usedIds.has(String(item._id)));
  return { items, removed, context };
}
