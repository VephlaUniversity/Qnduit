import { createHash } from "node:crypto";
import { activeSavedCv } from "./activeTalentCv.js";

// Only established CV storage destinations, never arbitrary redirects, API paths,
// images, signed URLs, local addresses or user-supplied query parameters.
export function publicCvAsset(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    if (!/^\/[^/]+\/raw\/upload\/(?:v\d+\/)?qnduit\/(?:resumes\/cv|talent-resumes)\/.+\.(pdf|docx?)$/i.test(url.pathname)) return null;
    return { url: url.href, format: /\.pdf$/i.test(url.pathname) ? "PDF" : /\.docx$/i.test(url.pathname) ? "DOCX" : "DOC" };
  } catch { return null; }
}
export const validPublicCvId = value => typeof value === "string" && /^(?:[a-f\d]{24}|legacy-[a-f\d]{32})$/i.test(value);
const cvId = (talentId, file) => /^[a-f\d]{24}$/i.test(String(file._id || "")) ? String(file._id).toLowerCase()
  : `legacy-${createHash("sha256").update(JSON.stringify([String(talentId), file.public_id || file.url])).digest("hex").slice(0, 32)}`;
const filename = (value, format) => {
  const name = typeof value === "string" ? Array.from(value).map(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || ["/", "\\"].includes(char) ? "-" : char).join("").trim().slice(0, 160) : "";
  return name || `CV.${format.toLowerCase()}`;
};
export const publicCvSummary = cv => ({ id: cv.id, name: cv.name, format: cv.format, viewPath: cv.viewPath });

export async function savedPublicCvs(talentId, username) {
  const active = await activeSavedCv(talentId);
  const files = active ? [active] : [];
  const rows = (Array.isArray(files) ? files : []).map(file => {
    const asset = publicCvAsset(file?.url);
    if (!asset) return null;
    const id = cvId(talentId, file);
    return { id, name: filename(file.name, asset.format), format: asset.format,
      viewPath: `/${encodeURIComponent(username)}/cv/${id}`,
      filePath: `/api/talents/public/${encodeURIComponent(username)}/cvs/${id}/file`, url: asset.url };
  }).filter(Boolean);
  // Duplicate identifiers must not pick a different document by array order.
  return rows.filter(row => rows.filter(other => other.id === row.id).length === 1).slice(0, 5);
}
