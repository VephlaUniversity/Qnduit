import { verificationBadgeDTO } from "./verificationBadge.js";

const socialKeys = ["facebook", "twitter", "instagram", "linkedin", "pinterest", "youtube"];
const common = "firstName lastName email phone location address categories showProfile accountStatus isVerified verificationBadgeOverride createdAt profileUpdatedAt".split(" ");
const socialFields = socialKeys.map(key => `socialNetworks.${key}`);
export const ADMIN_PROFILE_FIELDS = Object.freeze({
  talent: [...common, ...socialFields, ..."fullName jobTitle aboutMe qualification experienceTime language tags offeredSalary salaryType username publicProfileEnabled portfolioUrl avatar.url introVideo.url resume.url experience.title experience.company experience.description experience.startDate experience.endDate portfolio.title portfolio.description portfolio.imageUrl portfolio.projectUrl".split(" ")].join(" "),
  employer: [...common, ...socialFields, ..."accountType companyName displayName aboutCompany aboutYou companyIndustry companyWebsite companyEmail companySize foundedYear logo.url introVideo gallery.url gallery.type".split(" ")].join(" "),
});
const text = value => typeof value === "string" ? value : "";
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
const rows = value => Array.isArray(value) ? value.filter(item => item && typeof item === "object") : [];
const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
// No credentials or non-web schemes; allow local root-relative media paths.
const url = value => {
  if (typeof value !== "string" || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\")) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? value : ""; }
  catch { return ""; }
};

// Both query and output are allowlisted. Never serialize/spread account documents
// or nested media/subdocuments; future schema fields cannot escape this DTO.
export function adminProfileDTO(type, record) {
  if (!Object.hasOwn(ADMIN_PROFILE_FIELDS, type)) throw new Error("Invalid profile type");
  const profile = {
    id: String(record._id), userType: type,
    firstName: text(record.firstName), lastName: text(record.lastName),
    email: text(record.email), phone: text(record.phone), location: text(record.location), address: text(record.address),
    categories: strings(record.categories), showProfile: text(record.showProfile), accountStatus: text(record.accountStatus),
    emailConfirmed: record.isVerified === true, hasVerificationBadge: verificationBadgeDTO(record).hasVerificationBadge,
    createdAt: date(record.createdAt), profileUpdatedAt: date(record.profileUpdatedAt),
    socialNetworks: Object.fromEntries(socialKeys.map(key => [key, url(record.socialNetworks?.[key])])),
  };
  if (type === "talent") return {
    ...profile, fullName: text(record.fullName), jobTitle: text(record.jobTitle), aboutMe: text(record.aboutMe),
    qualification: text(record.qualification), experienceTime: text(record.experienceTime), language: text(record.language),
    tags: strings(record.tags), offeredSalary: text(record.offeredSalary), salaryType: text(record.salaryType),
    username: text(record.username), publicProfileEnabled: record.publicProfileEnabled === true,
    portfolioUrl: url(record.portfolioUrl), avatar: url(record.avatar?.url), introVideo: url(record.introVideo?.url), resume: url(record.resume?.url),
    experience: rows(record.experience).map(item => ({ title: text(item.title), company: text(item.company), description: text(item.description), startDate: text(item.startDate), endDate: text(item.endDate) })),
    portfolio: rows(record.portfolio).map(item => ({ title: text(item.title), description: text(item.description), imageUrl: url(item.imageUrl), projectUrl: url(item.projectUrl) })),
  };
  return {
    ...profile, accountType: text(record.accountType), companyName: text(record.companyName), displayName: text(record.displayName),
    aboutCompany: text(record.aboutCompany), aboutYou: text(record.aboutYou), companyIndustry: text(record.companyIndustry),
    companyWebsite: url(record.companyWebsite), companyEmail: text(record.companyEmail), companySize: text(record.companySize),
    foundedYear: Number.isFinite(record.foundedYear) ? record.foundedYear : null,
    logo: url(record.logo?.url), introVideo: url(record.introVideo),
    gallery: rows(record.gallery).map(item => ({ url: url(item.url), type: ["image", "video"].includes(item.type) ? item.type : "" })),
  };
}
