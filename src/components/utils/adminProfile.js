import { isCalendarDate } from "./jobDeadline.js";

export function formatAdminProfileDate(value, { dateOnly = false } = {}) {
  const empty = "Not provided";
  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (typeof value === "string") {
    // Calendar dates/partial experience dates have no timezone or implied day.
    if (/^\d{4}$/.test(value) && isCalendarDate(`${value}-01-01`)) return value;
    if (/^\d{4}-\d{2}$/.test(value) && isCalendarDate(`${value}-01`)) {
      return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`));
    }
    if (isCalendarDate(value)) {
      return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
    }
    if (/^present$/i.test(value)) return "Present";
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !isCalendarDate(value.slice(0, 10))) return empty;
  } else if (!(value instanceof Date)) return empty;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return empty;
  if (dateOnly && typeof value === "string") return formatAdminProfileDate(value.slice(0, 10));
  return new Intl.DateTimeFormat("en-GB", dateOnly ? { ...options, timeZone: "UTC" } : options).format(date);
}

export function safeAdminProfileUrl(value) {
  if (typeof value !== "string" || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\")) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? value : ""; }
  catch { return ""; }
}
export function adminProfileError(status) {
  return status === 400 ? "invalid" : status === 401 ? "expired" : status === 403 ? "forbidden" : status === 404 ? "missing" : "service-error";
}
const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";

// One selected read at a time. Cancellation and ownership are checked even if
// an adapter ignores AbortSignal; late responses never become another profile.
export function createAdminProfileLoader({ client, baseUrl, readOwner }) {
  let controller, version = 0;
  const cancel = () => { version++; controller?.abort(); };
  return {
    cancel,
    async load(subject, update) {
      cancel();
      const owner = readOwner(), key = ownerKey(owner), generation = version;
      controller = new AbortController();
      const signal = controller.signal;
      const current = () => !signal.aborted && generation === version && key === ownerKey(readOwner());
      if (!owner?.token || !owner.actor?.startsWith("admin:")) { update({ status: "expired" }); return; }
      if (!["talent", "employer"].includes(subject?.type) || !/^[a-f\d]{24}$/i.test(subject.id || "")) { update({ status: "invalid" }); return; }
      update({ status: "loading" });
      try {
        const result = await client.get(`${baseUrl}/api/admin/${subject.type === "talent" ? "talents" : "employers"}/${encodeURIComponent(subject.id)}`, {
          headers: { Authorization: `Bearer ${owner.token}` }, signal,
        });
        if (!current()) return;
        const profile = result.data?.profile;
        if (result.data?.success !== true || profile?.id !== subject.id || profile?.userType !== subject.type) throw new Error("Invalid profile response");
        update({ status: "ready", profile });
      } catch (error) {
        if (current() && error.code !== "ERR_CANCELED") update({ status: adminProfileError(error.response?.status) });
      }
    },
  };
}
