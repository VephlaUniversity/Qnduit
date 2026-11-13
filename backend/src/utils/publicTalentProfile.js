import { talentLocation } from "./talentLocation.js";
import { normalizePortfolioCaseStudy, portfolioOverview } from "./portfolioCaseStudy.js";
// Pure, explicit public DTO mapping. Never serialize Talent/Resume documents.
export const PUBLIC_TALENT_FIELDS = "username fullName firstName lastName jobTitle qualification experienceTime city country aboutMe categories tags avatar introVideo socialNetworks portfolioUrl portfolio experience";
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
export function portfolioExternalUrl(value) {
  if (!/^https?:\/\/[^/?#]/i.test(value || "")) return "";
  const safe = publicExternalUrl(value);
  if (!safe) return "";
  const host = new URL(safe).hostname;
  // External links are never fetched by the server. Reject private literals and
  // single-label hosts as well as the public DTO's existing forbidden hosts.
  if (!host.includes(".") || host.endsWith(".") || host.includes(":")) return "";
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every(Number.isInteger)) {
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224
      || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31
      || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127
      || a === 198 && (b === 18 || b === 19)) return "";
  }
  return safe;
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
export function publicVideoUrl(value) {
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
const projectSkills = value => {
  const seen = new Set();
  return list(value).map(item => text(item, 80)).filter(item => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
};
const hasProjectDetails = row => Boolean(row.title || row.description || row.projectUrl || row.skills?.length
  || row.overview || row.problemStatement || row.approach || row.results || row.role
  || row.toolsUsed?.length || row.skillsDemonstrated?.length || row.links?.length || row.video
  || row.featured || row.images?.length > 1
  || row.images?.some(image => image.alt || image.caption || image.comparisonLabel));

function publicCaseStudy(value) {
  const row = normalizePortfolioCaseStudy(value);
  return {
    overviewSource: portfolioOverview(value).source,
    overview: text(row.overview, 2000), problemStatement: text(row.problemStatement, 4000),
    approach: text(row.approach, 6000), results: text(row.results, 4000), role: text(row.role, 500),
    toolsUsed: projectSkills(row.toolsUsed), skillsDemonstrated: projectSkills(row.skillsDemonstrated),
    images: list(row.images).slice(0, 6).map(image => ({
      url: publicImageUrl(image?.url), alt: text(image?.alt, 300), caption: text(image?.caption, 500),
      comparisonLabel: ["before", "after"].includes(image?.comparisonLabel) ? image.comparisonLabel : "",
    })).filter(image => image.url),
    links: list(row.links).slice(0, 5).map(link => ({ label: text(link?.label, 80), url: portfolioExternalUrl(link?.url) }))
      .filter(link => link.label && link.url),
    video: publicVideoUrl(row.video), featured: row.featured === true,
  };
}
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
    jobTitle: text(talent.jobTitle, 160), location: talentLocation(talent), experienceTime: text(talent.experienceTime, 120),
    skills: strings([...publicResumeSkills(resume).map(row => row.title), ...list(talent.tags)]).slice(0, 5), avatar: publicImageUrl(talent.avatar?.url),
  };
}
// Input arrays are the already permitted public set. Never sort stored rows
// before entitlement selection: a hidden featured project must stay hidden.
export function publicPortfolioProjects(talent) {
  return [
    ...list(talent.portfolio).map((row, index) => ({ ...row, presentationKey: row.key || `talent:${index}` })),
    ...list(talent.gallery).map((row, index) => ({ ...row, presentationKey: row.key || `resume:${index}` })),
  ].sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
}

export function publicTalentProfileDto(talent, resume, { paidPortfolio = false, projectKey } = {}) {
  const card = publicTalentCard(talent, resume);
  const experienceSource = resume && Object.hasOwn(resume, "experience") ? resume.experience : talent.experience;
  const history = (items, owner) => list(items).slice(0, 50).map(row => ({
    title: text(row?.title, 160), [owner]: text(row?.[owner], 160), description: content(row?.description),
    startDate: dateText(row?.startDate), endDate: dateText(row?.endDate),
  })).filter(row => Object.values(row).some(Boolean));
  const portfolioRows = list(talent.portfolio).slice(0, 50).map((row, index) => {
    const skills = projectSkills(row?.skills);
    return {
      ...publicCaseStudy(row),
      key: `talent:${projectKey ? projectKey("talent", row, index) : index}`,
      title: text(row?.title, 160), description: content(row?.description),
      imageUrl: publicImageUrl(typeof row === "string" ? row : row?.imageUrl),
      projectUrl: publicExternalUrl(row?.projectUrl), ...(skills.length ? { skills } : {}),
    };
  });
  const galleryRows = list(resume?.portfolioImages).slice(0, 20).map((row, index) => {
    const description = content(row?.description), projectUrl = publicExternalUrl(row?.projectUrl), skills = projectSkills(row?.skills);
    return {
      ...publicCaseStudy(row),
      key: `resume:${projectKey ? projectKey("resume", row, index) : index}`,
      title: text(row?.title, 160),
      imageUrl: publicImageUrl(typeof row === "string" ? row : row?.url),
      ...(description ? { description } : {}), ...(projectUrl ? { projectUrl } : {}), ...(skills.length ? { skills } : {}),
    };
  });
  // Suppress only redundant bare images. Separate projects may share an asset;
  // never discard or combine their distinct descriptions, links or skills.
  const detailedImages = new Set([...portfolioRows, ...galleryRows].filter(hasProjectDetails).map(row => row.imageUrl).filter(Boolean));
  const images = new Set();
  const retainProject = row => {
    if (hasProjectDetails(row)) return true;
    if (!row.imageUrl || detailedImages.has(row.imageUrl) || images.has(row.imageUrl)) return false;
    images.add(row.imageUrl);
    return true;
  };
  const portfolio = portfolioRows.filter(retainProject), gallery = galleryRows.filter(retainProject);
  // The caller supplies only the authoritative publication entitlement. Unknown
  // eligibility gets the free display allowance; stored arrays remain untouched.
  // Cap after deduplication, in the same Talent-first order as the public UI.
  const projects = [...portfolio, ...gallery].slice(0, paidPortfolio === true ? 20 : 4);
  const socialNetworks = Object.fromEntries(["linkedin", "facebook", "twitter", "instagram", "pinterest", "youtube"]
    .map(key => [key, publicExternalUrl(talent.socialNetworks?.[key])]).filter(([, value]) => value));
  return {
    id: card.id, username: card.username, fullName: card.name, jobTitle: card.jobTitle, location: card.location,
    experienceTime: card.experienceTime, qualification: text(talent.qualification, 160), avatar: card.avatar,
    aboutMe: content(talent.aboutMe) || content(resume?.aboutMe), categories: strings(talent.categories), tags: strings(talent.tags),
    // Preserve Talent's current video field, including an explicit empty value.
    introVideo: publicVideoUrl(talent.introVideo && Object.hasOwn(talent.introVideo, "url") ? talent.introVideo.url : resume?.introVideo?.url),
    skills: publicResumeSkills(resume), portfolioUrl: publicExternalUrl(talent.portfolioUrl), socialNetworks,
    portfolio: projects.slice(0, portfolio.length),
    gallery: projects.slice(portfolio.length),
    experience: history(experienceSource, "company"),
    education: history(resume?.education, "academy"),
  };
}
