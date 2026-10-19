// UTC calendar boundaries; end is exclusive. No change to recording/deduplication.
export function profileViewSummaryRange(period, now = new Date()) {
  if (!["day", "week", "month", "year"].includes(period)) return null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === "month" || period === "year") start.setUTCDate(1);
  if (period === "year") start.setUTCMonth(0);
  const end = new Date(start);
  if (period === "day") end.setUTCDate(end.getUTCDate() + 1);
  if (period === "week") end.setUTCDate(end.getUTCDate() + 7);
  if (period === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  if (period === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
  const format = period === "day" ? "%Y-%m-%dT%H:00:00.000Z" : period === "year" ? "%Y-%m" : "%Y-%m-%d";
  const buckets = [];
  for (const date = new Date(start); date < end;) {
    const bucketStart = new Date(date);
    const key = date.toISOString().slice(0, period === "day" ? 24 : period === "year" ? 7 : 10);
    const name = period === "day" ? `${String(date.getUTCHours()).padStart(2, "0")}:00`
      : new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...(period === "year" ? { month: "short" } : { day: "numeric", month: "short" }) }).format(date);
    if (period === "day") date.setUTCHours(date.getUTCHours() + 1);
    else if (period === "year") date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 1);
    buckets.push({ key, start: bucketStart.toISOString(), end: date.toISOString(), name, views: 0 });
  }
  return { start, end, format, buckets };
}
