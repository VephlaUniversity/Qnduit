export function lagosDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
}

export function isCalendarDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function jobDateKey(value) {
  if (!value) return "";
  if (isCalendarDate(value)) return value;
  if (!(value instanceof Date) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !isCalendarDate(value.slice(0, 10)))) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? lagosDateKey(date) : "";
}

export function deadlineError(value, saved = "", now = new Date()) {
  if (!value) return ""; // Existing optionality is retained.
  if (!isCalendarDate(value)) return "Choose a valid deadline date.";
  if (value < lagosDateKey(now) && value !== jobDateKey(saved))
    return "Choose today or a future date (Africa/Lagos).";
  return "";
}

export function formatJobDeadline(value, empty = "N/A") {
  const key = jobDateKey(value);
  if (!key) return empty;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${key}T00:00:00.000Z`));
}
