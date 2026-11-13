import { portfolioStoredImages } from "./portfolioCaseStudy.js";
import { portfolioExternalUrl, publicExternalUrl, publicImageUrl, publicVideoUrl } from "./publicTalentProfile.js";

export { portfolioExternalUrl } from "./publicTalentProfile.js";
export { normalizePortfolioCaseStudy } from "./portfolioCaseStudy.js";

// Match Multer's existing per-field budget. TextEncoder measures serialized UTF-8
// bytes identically in the editor and server; JavaScript string length does not.
export const MAX_PORTFOLIO_FIELD_BYTES = 1024 * 1024;
export function validatePortfolioFieldSize(value, label = "Project metadata") {
  const bytes = new TextEncoder().encode(value).byteLength;
  // Busboy marks a field truncated as soon as its size reaches this boundary.
  if (bytes >= MAX_PORTFOLIO_FIELD_BYTES) {
    throw Object.assign(new Error(`${label} must be smaller than the 1 MiB metadata field limit. Save fewer project changes at once. Your draft and images are retained.`), {
      code: "PORTFOLIO_METADATA_TOO_LARGE",
    });
  }
  return bytes;
}

export const PORTFOLIO_TEXT_LIMITS = {
  title: 160, description: 2000, overview: 2000, problemStatement: 4000,
  approach: 6000, results: 4000, role: 500,
};
export const PORTFOLIO_METADATA_FIELDS = [
  ...Object.keys(PORTFOLIO_TEXT_LIMITS), "projectUrl", "skills", "toolsUsed",
  "skillsDemonstrated", "images", "links", "video", "featured",
];

const object = value => value && typeof value === "object" && !Array.isArray(value);
const own = (row, key) => Object.hasOwn(row, key);
const optionalText = (value, label, limit) => {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (text.length > limit) throw new Error(`${label} must be at most ${limit} characters.`);
  return text;
};

export function portfolioVideoUrl(value) {
  const safe = portfolioExternalUrl(value);
  return safe ? publicVideoUrl(safe) : "";
}

const stringList = (value, label) => {
  if (!Array.isArray(value) || value.length > 20) throw new Error(`Use at most 20 ${label} per project.`);
  const seen = new Set();
  return value.map(item => {
    if (typeof item !== "string") throw new Error(`Project ${label} must be text.`);
    return optionalText(item, `Project ${label}`, 80);
  }).filter(item => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function validPortfolioImages(images) {
  if (!Array.isArray(images) || images.length > 6) return false;
  const ids = new Set();
  return images.every(image => {
    if (!object(image) || typeof image._id !== "string" || !/^[\w-]{1,100}$/.test(image._id)
      || ids.has(image._id) || !publicImageUrl(image.url)
      || image.public_id !== undefined && (typeof image.public_id !== "string" || image.public_id.length > 255)
      || image.alt !== undefined && (typeof image.alt !== "string" || image.alt.length > 300)
      || image.caption !== undefined && (typeof image.caption !== "string" || image.caption.length > 500)
      || image.comparisonLabel !== undefined && !["", "before", "after"].includes(image.comparisonLabel)) return false;
    ids.add(image._id);
    return true;
  });
}

export function portfolioImageMetadata(row) {
  const result = {};
  for (const [key, limit] of [["alt", 300], ["caption", 500]]) {
    if (own(row, key)) result[key] = optionalText(row[key], `Image ${key}`, limit);
  }
  if (own(row, "comparisonLabel")) {
    if (!["", "before", "after"].includes(row.comparisonLabel)) throw new Error("Invalid image comparison label.");
    result.comparisonLabel = row.comparisonLabel;
  }
  return result;
}

function imageReferences(value, previous) {
  if (!Array.isArray(value) || value.length > 6) throw new Error("Use at most six images per project.");
  const stored = portfolioStoredImages(previous), used = new Set();
  const images = value.map(row => {
    if (!object(row) || Object.keys(row).some(key => !["id", "alt", "caption", "comparisonLabel"].includes(key))
      || typeof row.id !== "string" || used.has(row.id)) throw new Error("Invalid project image reference.");
    const matches = stored.filter(image => String(image._id) === row.id);
    if (matches.length !== 1) throw new Error("Project image does not belong to this project.");
    used.add(row.id);
    return { ...matches[0], ...portfolioImageMetadata(row) };
  });
  if (!validPortfolioImages(images)) throw new Error("Invalid stored project images.");
  return images;
}

// Shared by the owner editor and server. Keep accepted links usable by the public DTO.
export function portfolioMetadata(row, previous = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Invalid portfolio item.");
  }
  const supplied = key => own(row, key) ? row[key] : previous[key];
  const description = optionalText(supplied("description"), "Project description", 2000);
  const projectUrl = optionalText(supplied("projectUrl"), "Project URL", 2048);
  const validProjectUrl = own(row, "projectUrl")
    ? portfolioExternalUrl(projectUrl) : publicExternalUrl(projectUrl);
  if (projectUrl && !validProjectUrl) {
    throw new Error("Enter a valid absolute HTTP or HTTPS project URL without credentials or a local/internal host.");
  }
  const skills = stringList(supplied("skills") === undefined ? [] : supplied("skills"), "skills");
  const metadata = {
    ...(Object.hasOwn(row, "title") ? { title: optionalText(row.title, "Project title", 160) } : {}),
    description, projectUrl, skills,
  };
  for (const key of PORTFOLIO_METADATA_FIELDS.filter(key => !["title", "description", "projectUrl", "skills"].includes(key))) {
    // Preserve trusted stored fields verbatim when omitted, including legacy values.
    if (!own(row, key)) {
      if (own(previous, key)) metadata[key] = previous[key];
      continue;
    }
    const value = row[key];
    if (value === undefined) throw new Error(`Invalid project ${key}.`);
    if (own(PORTFOLIO_TEXT_LIMITS, key)) metadata[key] = optionalText(value, `Project ${key}`, PORTFOLIO_TEXT_LIMITS[key]);
    else if (["toolsUsed", "skillsDemonstrated"].includes(key)) metadata[key] = stringList(value, key);
    else if (key === "featured") {
      if (typeof value !== "boolean") throw new Error("Project featured must be true or false.");
      metadata.featured = value;
    } else if (key === "video") {
      const text = optionalText(value, "Project video", 2048);
      if (text && !portfolioVideoUrl(text)) throw new Error("Use a valid YouTube project video URL.");
      metadata.video = text ? portfolioVideoUrl(text) : "";
    } else if (key === "links") {
      if (!Array.isArray(value) || value.length > 5) throw new Error("Use at most five project links.");
      metadata.links = value.map(link => {
        if (!object(link) || Object.keys(link).some(field => !["label", "url"].includes(field))) throw new Error("Invalid project link.");
        const label = optionalText(link.label, "Link label", 80);
        const url = optionalText(link.url, "Link URL", 2048);
        if (!label || !portfolioExternalUrl(url)) throw new Error("Provide a link label and valid external HTTP or HTTPS URL.");
        return { label, url: portfolioExternalUrl(url) };
      });
    } else if (key === "images") metadata.images = imageReferences(value, previous);
  }
  return metadata;
}
