// Pure, explicit public DTO mapping. Never serialize Talent/Resume documents.
export const PUBLIC_TALENT_FIELDS = "username fullName firstName lastName jobTitle qualification experienceTime location aboutMe categories tags avatar introVideo socialNetworks portfolioUrl portfolio experience";
export const PUBLIC_RESUME_FIELDS = "talent aboutMe portfolioImages education experience skills introVideo";
const text = (value, limit = 20000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const list = value => Array.isArray(value) ? value : [];
const content = value => {
  const raw = text(value);
  const visible = raw.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160);/gi, " ").trim();
  return visible ? raw : "";
};
export function publicExternalUrl(value) {
  if (typeof value !== "string" || !value || value.length > 2048 || /[\s\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password
      || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) || /\.(local|internal)$/.test(url.hostname)) return "";
    return url.href;
  } catch { return ""; }
}
export function publicImageUrl(value) {
  if (typeof value !== "string") return "";
  // Permit only established public relative image folders, never API/CV paths.
  if (/^\/(?:images|uploads\/(?:avatars|portfolio|gallery))\/[a-zA-Z0-9/_ .%-]+\.(?:png|jpe?g|webp|gif)$/i.test(value) && !value.includes("..") && !/%(?:2e|2f|5c|0[0-9a-f])/i.test(value) && !/\s/.test(value)) return value;
  const safe = publicExternalUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  if (
    /\/(?:raw|authenticated|private)(?:\/|$)|\/resumes\/cv(?:\/|$)|\/cv(?:\/|$)|\.(?:pdf|docx?)(?:$|\/)/i.test(url.pathname) ||
    [...url.searchParams.keys()].some(key => /token|signature|authorization/i.test(key))
  ) {
    return "";
  }
  return safe;
}
function videoUrl(value) {
  const safe = publicExternalUrl(value);
  if (!safe) return "";
  const url = new URL(safe), host = url.hostname.replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) id = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1];
  return /^[\w-]{11}$/.test(id || "") ? `https://www.youtube.com/watch?v=${id}` : "";
}
const dateText = value => {
  const raw = text(value, 40);
  if (/^present$/i.test(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && Number.isFinite(Date.parse(raw)) && new Date(raw).toISOString().slice(0, 10) === raw) return raw;
  return "";
};
const strings = value => [...new Set(list(value).map(item => text(item, 120)).filter(Boolean))].slice(0, 30);
export function publicResumeSkills(resume) {
  return list(resume?.skills).slice(0, 30).map(row => {
    const title = text(row?.title, 60), raw = row?.percent;
    const percent = typeof raw === "number" || typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    return { title, ...(Number.isFinite(percent) && percent >= 0 && percent <= 100 ? { percent } : {}) };
  }).filter(row => row.title);
}
export function publicTalentCard(talent, resume) {
  return { id: String(talent._id), username: text(talent.username, 160),
    name: text(talent.fullName, 160) || [text(talent.firstName, 80), text(talent.lastName, 80)].filter(Boolean).join(" ") || "Talent",
    jobTitle: text(talent.jobTitle, 160), location: text(talent.location, 160), experienceTime: text(talent.experienceTime, 120),
    skills: strings([...publicResumeSkills(resume).map(row => row.title), ...list(talent.tags)]).slice(0, 5), avatar: publicImageUrl(talent.avatar?.url),
  };
}
export function publicTalentProfileDto(talent, resume) {
  const card = publicTalentCard(talent, resume);
  const experienceSource = resume && Object.hasOwn(resume, "experience") ? resume.experience : talent.experience;
  const history = (items, owner) => list(items).slice(0, 50).map(row => ({
    title: text(row?.title, 160), [owner]: text(row?.[owner], 160), description: content(row?.description),
    startDate: dateText(row?.startDate), endDate: dateText(row?.endDate),
  })).filter(row => Object.values(row).some(Boolean));
  const portfolio = list(talent.portfolio).slice(0, 50).map(row => ({
    title: text(row?.title, 160), description: content(row?.description), imageUrl: publicImageUrl(row?.imageUrl), projectUrl: publicExternalUrl(row?.projectUrl),
  })).filter(row => Object.values(row).some(Boolean));
  const images = new Set(portfolio.map(row => row.imageUrl).filter(Boolean));
  const gallery = [];
  for (const row of list(resume?.portfolioImages).slice(0, 20)) {
    const imageUrl = publicImageUrl(row?.url);
    if (imageUrl && !images.has(imageUrl)) { images.add(imageUrl); gallery.push({ imageUrl }); }
  }
  const socialNetworks = Object.fromEntries(["linkedin", "facebook", "twitter", "instagram", "pinterest", "youtube"]
    .map(key => [key, publicExternalUrl(talent.socialNetworks?.[key])]).filter(([, value]) => value));
  return {
    id: card.id, username: card.username, fullName: card.name, jobTitle: card.jobTitle, location: card.location,
    experienceTime: card.experienceTime, qualification: text(talent.qualification, 160), avatar: card.avatar,
    aboutMe: content(talent.aboutMe) || content(resume?.aboutMe), categories: strings(talent.categories), tags: strings(talent.tags),
    // Preserve Talent's current video field, including an explicit empty value.
    introVideo: videoUrl(talent.introVideo && Object.hasOwn(talent.introVideo, "url") ? talent.introVideo.url : resume?.introVideo?.url),
    skills: publicResumeSkills(resume), portfolioUrl: publicExternalUrl(talent.portfolioUrl), socialNetworks,
    portfolio, gallery, experience: history(experienceSource, "company"), education: history(resume?.education, "academy"),
  };
}
