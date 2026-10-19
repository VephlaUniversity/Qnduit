// Clients may retain only IDs from this job, never arbitrary media URLs/objects.
export function jobGallerySelection(body, existing = []) {
  const error = "Gallery selection is invalid or changed. Reload the job and try again.";
  if (Object.keys(body).some(key => key === "gallery" || key.startsWith("gallery."))) return { error };
  if (!Object.hasOwn(body, "retainedGalleryIds")) return { items: [...existing], explicit: false };
  let ids = body.retainedGalleryIds;
  try { if (typeof ids === "string") ids = JSON.parse(ids); }
  catch { return { error }; }
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) return { error };
  const available = new Map(existing.map(item => [String(item._id).toLowerCase(), item]));
  if (ids.some(id => !available.has(id.toLowerCase()))) return { error };
  return { items: ids.map(id => available.get(id.toLowerCase())), explicit: true };
}
