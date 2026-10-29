import { publicImageUrl } from "../../../backend/src/utils/publicTalentProfile.js";

// Use only saved public URLs, never storage IDs or private résumé media.
export function jobImageSources(job) {
  const sources = [];
  const seen = new Set();
  const add = (value, kind) => {
    const url = publicImageUrl(value);
    if (url && !seen.has(url)) {
      seen.add(url);
      sources.push({ url, kind });
    }
  };
  add(job?.featuredImage?.url, "job");
  for (const item of Array.isArray(job?.gallery) ? job.gallery : []) {
    if (item?.type !== "video") add(item?.url, "job");
  }
  const logo = job?.employer?.logo;
  add(typeof logo === "string" ? logo : logo?.url, "logo");
  return sources;
}
