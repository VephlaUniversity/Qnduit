// Display helpers for job data returned by the API (the API does not send
// daysLeft, rating, postedDate or a formatted salary, so derive them here).

export function daysLeft(deadlineDate) {
  if (!deadlineDate) return null;
  const end = new Date(deadlineDate);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

export function daysLeftLabel(deadlineDate, suffix = "days left") {
  const days = daysLeft(deadlineDate);
  if (days === null) return "No deadline";
  if (days === 0) return "Closes today";
  return `${days} ${days === 1 ? "day" : "days"} ${suffix.replace(/^days?\s*/, "")}`;
}

export function formatSalary(salary) {
  if (!salary || typeof salary !== "object") return "Salary not specified";
  const { min, max, type } = salary;
  const hasMin =
    Number.isFinite(Number(min)) && min !== null && min !== undefined;
  const hasMax =
    Number.isFinite(Number(max)) && max !== null && max !== undefined;
  if (!hasMin && !hasMax) return "Salary not specified";
  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  const range =
    hasMin && hasMax ? `${fmt(min)} - ${fmt(max)}` : fmt(hasMin ? min : max);
  return type && typeof type === "string" ? `${range} / ${type}` : range;
}

export function formatPosted(createdAt) {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export function postedWithin(createdAt, window) {
  if (!window || window === "anytime") return true;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  const limits = { today: 1, week: 7, month: 30 };
  return Date.now() - created <= (limits[window] ?? Infinity) * 86400000;
}

// Opens the device share sheet when available, otherwise copies the link.
export async function shareLink({ title, text, url }) {
  const link =
    url || (typeof window !== "undefined" ? window.location.href : "");
  if (!link) return "failed";

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({ title, text, url: link });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // fall through to copying
    }
  }

  try {
    await navigator.clipboard.writeText(link);
    return "copied";
  } catch {
    return "failed";
  }
}

// ---- SEO-friendly job addresses -------------------------------------------
// A job lives at /jobs/<title>-<company>-<id>, for example
// /jobs/senior-frontend-engineer-acme-64f1c2a9b3d4e5f607182930
// The 24-character id at the end is what the server looks up; the words in
// front are only for people and search engines. Old /jobs/<id> links still work.

export function slugify(text, maxLength = 70) {
  const slug = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

export function jobPath(job) {
  if (!job?._id) return "/jobs";
  const slug = slugify(
    [job.jobTitle, job.employer?.companyName].filter(Boolean).join(" "),
  );
  return (slug ? `/jobs/${slug}-${job._id}` : `/jobs/${job._id}`) + jobSourceQuery(job);
}

// Takes what is in the address bar and returns the id.
export function jobIdFromParam(param) {
  const match = /([a-f0-9]{24})$/i.exec(String(param || ""));
  return match ? match[1] : String(param || "");
}

export const jobSource = job => job?.source === "admin" ? "admin" : "employer";
export const jobKey = job => `${jobSource(job)}:${job?._id || job?.id || ""}`;
export const jobSourceQuery = job => jobSource(job) === "admin" ? "?source=admin" : "";
export const talentJobPath = job => `/talent-dashboard/job-results/details/${job._id || job.id}${jobSourceQuery(job)}`;
