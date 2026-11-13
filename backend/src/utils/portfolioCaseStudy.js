const own = (row, key) => Object.hasOwn(row, key);

// Derive provenance from the stored field's presence, never from equal text.
// Keep it separate from normalized owner drafts, which include fallback values.
export function portfolioOverview(value) {
  const row = value && typeof value === "object" ? value : {};
  if (own(row, "overview")) return { source: "canonical", value: row.overview };
  return row.description ? { source: "legacy", value: row.description } : { source: "none", value: "" };
}

// Only trusted, stored project data may supply media URLs and provider IDs.
// The synthetic image identity is scoped to its containing project.
export function portfolioStoredImages(row) {
  if (own(row, "images")) return Array.isArray(row.images) ? row.images : [];
  const url = row.imageUrl || row.url;
  return url ? [{ _id: "legacy-image", url, ...(row.public_id ? { public_id: row.public_id } : {}) }] : [];
}

// Read-time compatibility only: absence falls back; explicit empty values do not.
// Call with stored records, never untrusted client media references.
export function normalizePortfolioCaseStudy(value) {
  const row = typeof value === "string" ? { imageUrl: value } : value || {};
  return {
    ...row,
    ...Object.fromEntries(["problemStatement", "approach", "results", "role", "video"]
      .map(key => [key, own(row, key) ? row[key] : ""])),
    overview: portfolioOverview(row).value,
    toolsUsed: own(row, "toolsUsed") ? row.toolsUsed : [],
    skillsDemonstrated: own(row, "skillsDemonstrated") ? row.skillsDemonstrated : row.skills || [],
    images: portfolioStoredImages(row),
    links: own(row, "links") ? row.links : row.projectUrl ? [{ label: "View project", url: row.projectUrl }] : [],
    featured: row.featured ?? false,
  };
}
