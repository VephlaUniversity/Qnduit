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
  const hasMin = Number.isFinite(Number(min)) && min !== null && min !== undefined;
  const hasMax = Number.isFinite(Number(max)) && max !== null && max !== undefined;
  if (!hasMin && !hasMax) return "Salary not specified";
  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  const range = hasMin && hasMax ? `${fmt(min)} - ${fmt(max)}` : fmt(hasMin ? min : max);
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
