// Public Talent location comes only from fields explicitly entered for this purpose.
// Never derive it from legacy location/address strings or precise coordinates.
const part = value => typeof value === "string" ? value.trim().slice(0, 100) : "";
export const talentLocation = record => [part(record?.city), part(record?.country)].filter(Boolean).join(", ");

export function talentLocationPatch(body) {
  const updates = {}, errors = {};
  for (const key of ["city", "country"]) {
    if (!Object.hasOwn(body, key)) continue;
    const value = body[key];
    if (typeof value !== "string" || value.trim().length > 100 || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
      errors[key] = `${key === "city" ? "City" : "Country"} must be text of at most 100 characters on one line.`;
    } else updates[key] = value.trim();
  }
  return { updates, errors };
}

// Shared literal Mongo search expression, independent of private legacy fields.
export const talentLocationExpression = {
  $trim: { input: { $concat: [
    { $trim: { input: { $ifNull: ["$city", ""] } } },
    { $cond: [{ $and: [
      { $ne: [{ $trim: { input: { $ifNull: ["$city", ""] } } }, ""] },
      { $ne: [{ $trim: { input: { $ifNull: ["$country", ""] } } }, ""] },
    ] }, ", ", ""] },
    { $trim: { input: { $ifNull: ["$country", ""] } } },
  ] } },
};
export const talentLocationMatch = regex => ({ $expr: { $regexMatch: {
  input: talentLocationExpression, regex: regex.source, options: "i",
} } });

// Use a declared response field list even when a query happens to select more.
export function talentFields(record, fields) {
  const source = record?.toObject ? record.toObject() : record || {};
  return Object.fromEntries(fields.split(" ").filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]]));
}
