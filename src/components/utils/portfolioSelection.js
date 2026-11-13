import { normalizePortfolioCaseStudy } from "../../../backend/src/utils/portfolioCaseStudy.js";
import { portfolioImageMetadata, portfolioMetadata, PORTFOLIO_METADATA_FIELDS, validatePortfolioFieldSize } from "../../../backend/src/utils/portfolioMetadata.js";

// Queue files without allocating previews until the current owner's allowance is known.
const key = file =>
  JSON.stringify([file.name, file.size, file.type, file.lastModified]);

export function queuePortfolioFiles(queue, files, selected = []) {
  const seen = new Set([...queue, ...selected].map(key));
  const problems = [];
  for (const file of files) {
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type))
      problems.push("Choose a PNG or JPG image.");
    else if (!file.size || file.size > 5 * 1024 * 1024)
      problems.push("Images must be 5 MB or smaller.");
    else if (!/\.(png|jpe?g)$/i.test(file.name))
      problems.push("Choose a PNG or JPG image.");
    else if (!seen.has(key(file))) {
      queue.push(file);
      seen.add(key(file));
    }
  }
  return [...new Set(problems)];
}

export function portfolioEditorProject(row) {
  const normalized = normalizePortfolioCaseStudy(row);
  return {
    ...normalized,
    images: normalized.images.map(image => ({ ...image, _editorKey: String(image._id) })),
    _savedImages: normalized.images,
    _dirty: [],
  };
}

export function changePortfolioField(item, field, value) {
  if (!PORTFOLIO_METADATA_FIELDS.includes(field)) throw new Error("Unknown project field.");
  return { ...item, [field]: value, _dirty: [...new Set([...(item._dirty || []), field])] };
}

export function movePortfolioImage(images, index, direction) {
  const next = [...images], target = index + direction;
  if (target < 0 || target >= next.length) return images;
  next.splice(target, 0, next.splice(index, 1)[0]);
  return next;
}

export function portfolioImageUploadReference(image) {
  return `${image._editorKey}.${image.file.type === "image/png" ? "png" : "jpg"}`;
}

// Changed fields only: GET fallbacks must not silently become stored overrides.
// Gallery manifests contain owner-scoped IDs/upload names, never asset URLs/IDs.
export function portfolioEditorMetadata(item) {
  const fields = item._new ? PORTFOLIO_METADATA_FIELDS : item._dirty || [];
  const supplied = Object.fromEntries(fields.filter(field => field !== "images" && Object.hasOwn(item, field))
    .map(field => [field, item[field]]));
  const validated = portfolioMetadata(supplied);
  const result = Object.fromEntries(Object.keys(supplied).map(field => [field, validated[field]]));
  if (item._new && !validated.title) throw new Error("Enter a project title.");
  if (item._new || fields.includes("images")) {
    if (!Array.isArray(item.images) || item.images.length > 6) throw new Error("Use at most six images per project, including the cover.");
    const seen = new Set();
    result.images = item.images.map(image => {
      const metadata = portfolioImageMetadata(image);
      const reference = image.file ? { upload: portfolioImageUploadReference(image) } : { id: String(image._id) };
      const identity = reference.upload || reference.id;
      if (seen.has(identity)) throw new Error("Duplicate project image reference.");
      seen.add(identity);
      if (!image.file) portfolioMetadata({ images: [{ ...reference, ...metadata }] }, { images: item._savedImages || [] });
      return { ...reference, ...metadata };
    });
  }
  return result;
}

export function portfolioEditorDraft({ talentProjects, existingPortfolio, newPortfolio, cvFiles = [] }) {
  const uploads = new Map();
  const metadata = item => {
    const details = portfolioEditorMetadata(item);
    if (details.images) for (const image of item.images.filter(row => row.file)) {
      const name = portfolioImageUploadReference(image);
      if (uploads.has(name)) throw new Error("Duplicate portfolio upload reference.");
      const problems = queuePortfolioFiles([], [image.file]);
      if (problems.length) throw new Error(problems.join(" "));
      uploads.set(name, image.file);
    }
    return details;
  };
  const talentItems = talentProjects.map(item => item.removed
    ? { ref: item.ref, remove: true } : { ref: item.ref, ...metadata(item) });
  const portfolioItems = [
    ...existingPortfolio.map(item => ({ id: String(item._id), ...metadata(item) })),
    ...newPortfolio.map(item => ({ newProject: item._id, ...metadata(item) })),
  ];
  validatePortfolioFieldSize(JSON.stringify(talentItems), "Talent project metadata");
  validatePortfolioFieldSize(JSON.stringify(portfolioItems), "Resume project metadata");
  if (uploads.size > 20) throw new Error("Upload at most 20 portfolio images per save.");
  const bytes = [...uploads.values(), ...cvFiles].reduce((total, file) => total + file.size, 0);
  if (bytes > 30 * 1024 * 1024) throw new Error("Selected files exceed the combined 30 MiB save limit. Remove some pending files before saving.");
  return { talentItems, portfolioItems, uploads };
}

// Only an explicit server failure ends receipt recovery. HTTP status alone does
// not establish whether an upload/transaction reached the server.
export function portfolioSaveFailure(error) {
  const data = error?.response?.data;
  return data?.saveState === "failed" ? data : null;
}

export function portfolioProjectAllowance({ ready, paid, savedCount, projectCount }) {
  const limit = ready ? paid ? 20 : 4 : null;
  const ceiling = ready ? Math.max(limit, savedCount) : savedCount;
  return { limit, ceiling, room: Math.max(0, ceiling - projectCount) };
}

export function takePortfolioFiles(queue, { ready, currentOwner, room }) {
  if (!currentOwner) {
    queue.splice(0);
    return { files: [], rejected: 0 };
  }
  if (!ready) return { files: [], rejected: 0 };
  const pending = queue.splice(0);
  return {
    files: pending.slice(0, room),
    rejected: Math.max(0, pending.length - room),
  };
}
