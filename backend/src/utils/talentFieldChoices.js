// Contextual validation keeps saved legacy choices valid without permitting new
// arbitrary values. Do not use a schema enum that would reject unrelated saves.
export const GENDER_OPTIONS = Object.freeze(["Male", "Female", "Non-binary", "Prefer not to say"]);
export const DEGREE_OPTIONS = Object.freeze(["GCSE", "A-Level", "Diploma", "Bachelor's", "Master's", "PhD"]);
export function savedChoiceError(value, previous, options, label) {
  if (value === previous || value === "" || typeof value === "string" && options.includes(value)) return "";
  return `Choose a listed ${label.toLowerCase()} or retain the saved value.`;
}
const identity = row => row?._id != null ? `_id:${String(row._id)}` : row?.id != null ? `id:${String(row.id)}` : null;

// _sourceIndex is a transient reference for legacy rows without stored IDs.
// The unified save's existing revision check protects the source snapshot.
export function prepareEducation(rows, previous = []) {
  if (!Array.isArray(rows)) throw Object.assign(new Error("Invalid education."), { statusCode: 400 });
  const used = new Set();
  return rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw Object.assign(new Error("Invalid education entry."), { statusCode: 400 });
    const key = identity(row);
    let sourceIndex;
    if (key) {
      const matches = previous.map((old, i) => identity(old) === key ? i : -1).filter(i => i >= 0);
      if (matches.length > 1) throw Object.assign(new Error("Ambiguous saved education identity."), { statusCode: 400 });
      sourceIndex = matches[0];
    } else if (Object.hasOwn(row, "_sourceIndex") && row._sourceIndex !== null) {
      sourceIndex = row._sourceIndex;
      if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= previous.length || identity(previous[sourceIndex])) throw Object.assign(new Error("Invalid education source."), { statusCode: 400 });
    } else if (!Object.hasOwn(row, "_sourceIndex") && !identity(previous[index])) {
      // Compatibility with older editors that submit id-less rows in place.
      sourceIndex = index < previous.length ? index : undefined;
    }
    if (sourceIndex !== undefined) {
      if (used.has(sourceIndex)) throw Object.assign(new Error("Duplicate education source."), { statusCode: 400 });
      used.add(sourceIndex);
    }
    const source = sourceIndex === undefined ? undefined : previous[sourceIndex];
    const error = savedChoiceError(row.title, source?.title, DEGREE_OPTIONS, "Degree level");
    if (error) throw Object.assign(new Error(`Education ${index + 1}: ${error}`), { statusCode: 400 });
    // UI-only keys never enter stored education. Existing IDs/custom fields pass
    // through unchanged; dates and descriptions are not normalized or inferred.
    const { _sourceIndex, _editorKey, ...stored } = row;
    if (source) {
      for (const key of ["academy", "title", "startDate", "endDate", "description"]) {
        if (!Object.hasOwn(source, key) && stored[key] === "") delete stored[key];
      }
    }
    if (!source) return stored;
    for (const key of Object.keys(source)) {
      if (JSON.stringify(source[key]) === JSON.stringify(stored[key])) stored[key] = source[key];
    }
    return { ...source, ...stored,
      ...(Object.hasOwn(source, "_id") ? { _id: source._id } : {}),
      ...(Object.hasOwn(source, "id") ? { id: source.id } : {}),
    };
  });
}
