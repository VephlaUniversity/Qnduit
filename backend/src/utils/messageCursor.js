import { Buffer } from "node:buffer";
// Cursors are scoped to the authenticated query, never used as authorization.
const idPattern = /^[a-f\d]{24}$/;
export const pageLimit = value => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > 100) throw new Error("Invalid pagination");
  return Number(value);
};
export const encodeCursor = (scope, date, id) => Buffer.from(JSON.stringify({ v: 1, scope, date: date?.toISOString() ?? null, id })).toString("base64url");
export const decodeCursor = (value, scope, chat = false) => {
  if (typeof value !== "string" || value.length > 800 || !/^[\w-]+$/.test(value)) throw new Error("Invalid cursor");
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  const validDate = parsed.date === null || typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.date)
    && Number.isFinite(new Date(parsed.date).getTime()) && new Date(parsed.date).toISOString() === parsed.date;
  const validId = typeof parsed.id === "string" && (chat ? /^(Talent|Employer):[a-f\d]{24}$/.test(parsed.id) : idPattern.test(parsed.id));
  if (parsed.v !== 1 || parsed.scope !== scope || !validDate || !validId || encodeCursor(scope, parsed.date === null ? null : new Date(parsed.date), parsed.id) !== value) throw new Error("Invalid cursor");
  return { date: parsed.date === null ? null : new Date(parsed.date), id: parsed.id };
};
