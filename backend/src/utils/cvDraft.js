import { DEGREE_OPTIONS } from "./talentFieldChoices.js";
import { educationTextKey as key, qualificationIdentity, qualificationRelation, educationDateIdentity, educationDateRelation } from "./cvIdentity.js";

export const educationDraftFields = ["academy", "title", "startDate", "endDate", "description"];
const qualification = row => {
  if (row._initialTitle !== undefined && row.title !== row._initialTitle) return qualificationIdentity(row.title);
  if (row.cvImport?.sourceKey) {
    try {
      const source = JSON.parse(row.cvImport.sourceKey);
      if (source.mappedTitle === row.title && source.qualification) return source.qualification;
    } catch { /* Invalid metadata is rejected at the persistence boundary. */ }
  }
  if (row.warnings?.some(value => /^Multiple degree values/i.test(value))) return qualificationIdentity("");
  const evidence = (Array.isArray(row.evidence) ? row.evidence : []).filter(item => item.field === "title")
    .map(item => qualificationIdentity(item.text.replace(/^(?:degree(?: level)?|qualification)\s*:\s*/i, "")));
  if (new Set(evidence.map(value => JSON.stringify(value))).size > 1) return qualificationIdentity("");
  return evidence[0] || qualificationIdentity(row.title);
};
export const educationSuggestionKey = row => {
  const q = qualification(row), start = educationDateIdentity(row.startDate), end = educationDateIdentity(row.endDate);
  return JSON.stringify({ academy: key(row.academy), qualification: q, mappedTitle: row.title, start: start.raw, end: end.raw,
    ...(!q.family || !start.known || !end.known ? { uncertainSource: key(row.description) } : {}) });
};
function savedQualification(row, imports) {
  const source = row.cvImport?.sourceKey || [...imports].find(([, editorKey]) => editorKey === row._editorKey)?.[0];
  if (!source) return qualification(row);
  let parsed;
  try { parsed = JSON.parse(source); } catch { return qualification(row); }
  if (parsed.qualification) return parsed.mappedTitle === row.title ? parsed.qualification : qualification(row);
  return qualificationIdentity(parsed.at(-1) || parsed[1]);
}
export function educationDuplicate(candidate, previous, imports = new Map()) {
  if (candidate.cvImport?.key && previous.some(row => row.cvImport?.key === candidate.cvImport.key)) return "imported";
  const imported = imports.get(candidate._sourceKey);
  if (imported && previous.some(row => row._editorKey === imported)) return "imported";
  let ambiguous = false;
  if (key(candidate.academy) && previous.some(row => {
    const relations = [qualificationRelation(qualification(candidate), savedQualification(row, imports)),
      educationDateRelation(educationDateIdentity(candidate.startDate), educationDateIdentity(row.startDate)),
      educationDateRelation(educationDateIdentity(candidate.endDate), educationDateIdentity(row.endDate))];
    if (key(row.academy) !== key(candidate.academy)) {
      if (key(row.academy).replace(/ /g, "") === key(candidate.academy).replace(/ /g, "") && !relations.includes("different")) ambiguous = true;
      if (relations.every(value => value !== "different") && relations.slice(1).every(value => value === "equal")
        && key(row.description) && key(row.description) === key(candidate.description)) ambiguous = true;
      return false;
    }
    if (relations[0] === "different" && relations.slice(1).every(value => value === "equal")
      && key(row.description) && key(row.description) === key(candidate.description)) { ambiguous = true; return false; }
    const candidateQualification = qualification(candidate), storedQualification = savedQualification(row, imports);
    if ((candidateQualification.family.startsWith("custom:") || storedQualification.family.startsWith("custom:"))
      && !relations.slice(1).includes("different") && relations[0] !== "equal") { ambiguous = true; return false; }
    // One changed date can be a corrected course end/start, not a new course.
    if (relations[0] !== "different" && relations.slice(1).includes("equal") && relations.slice(1).includes("different")) {
      ambiguous = true; return false;
    }
    if (relations.includes("different")) return false;
    if (relations.every(value => value === "equal")) return true;
    ambiguous = true; return false;
  })) return "duplicate";
  if (ambiguous) return "ambiguous";
  return possibleEducationDuplicate(candidate, previous) ? "possible" : "";
}
export function possibleEducationDuplicate(candidate, previous) {
  return Boolean(key(candidate.academy)) && previous.some(row => key(row.academy) === key(candidate.academy));
}
export function educationDraftRows(entries) {
  if (!Array.isArray(entries) || entries.length > 20) throw Error("Invalid education draft.");
  return entries.map(entry => {
    const fields = Object.fromEntries(educationDraftFields.map(field => [field, typeof entry[field] === "string" ? entry[field] : ""]));
    if (!DEGREE_OPTIONS.includes(fields.title)) fields.title = "";
    return { ...fields, ...(entry.cvImport ? { cvImport: entry.cvImport } : {}), selected: true, _initialTitle: fields.title, _sourceKey: educationSuggestionKey({ ...fields, evidence: entry.evidence, warnings: entry.warnings }),
      evidence: Array.isArray(entry.evidence) ? entry.evidence.filter(item => educationDraftFields.includes(item.field)
        && typeof item.text === "string" && typeof item.location === "string").slice(0, 10) : [],
      warnings: Array.isArray(entry.warnings) ? entry.warnings.filter(value => typeof value === "string").slice(0, 10) : [],
    };
  });
}
// Append only: no stored/source identities or extraction metadata cross this boundary.
export function appendEducationDraft(previous, entries, makeKey, imports = new Map()) {
  const next = entries.some(row => row.selected) ? previous.filter(row => !row._placeholder || educationDraftFields.some(field => row[field])) : [...previous];
  for (const row of entries.filter(row => row.selected)) {
    const duplicate = educationDuplicate(row, next, imports);
    if (["imported", "duplicate"].includes(duplicate) || duplicate === "ambiguous" && !row._duplicateReviewed) continue;
    const editorKey = makeKey();
    next.push({ ...Object.fromEntries(educationDraftFields.map(field => [field, String(row[field] || "")])),
      ...(row.cvImport ? { cvImport: { ...row.cvImport, reviewedDistinct: Boolean(row._duplicateReviewed) } } : {}),
      _editorKey: editorKey, _sourceIndex: null });
    if (row._sourceKey) imports.set(row._sourceKey, editorKey);
  }
  return next;
}

export const experienceDraftFields = ["company", "title", "startDate", "endDate", "description"];
export const validSkillLevel = value => value === "" || /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
export const skillKey = value => String(value || "").normalize("NFKC").toLowerCase().trim()
  .replace(/\s*([+#.])\s*/g, "$1").replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim().replace(/\.+$/, "");
export function cvSourceKey(section, row) {
  if (section === "education") return educationSuggestionKey(row);
  if (section === "skills") return JSON.stringify({ title: skillKey(row.title) });
  return JSON.stringify({ company: key(row.company), title: key(row.title), start: educationDateIdentity(row.startDate).raw,
    end: educationDateIdentity(row.endDate).raw, ...(!row.company || !row.title || !row.startDate || !row.endDate ? { uncertainSource: key(row.description) } : {}) });
}
export function cvDuplicate(section, candidate, previous, imports = new Map()) {
  if (section === "education") return educationDuplicate(candidate, previous, imports);
  if (candidate.cvImport?.key && previous.some(row => row.cvImport?.key === candidate.cvImport.key)) return "imported";
  const imported = imports.get(candidate._sourceKey);
  if (imported && previous.some(row => row._editorKey === imported)) return "imported";
  if (section === "skills") {
    const title = skillKey(candidate.title), compact = value => skillKey(value).replace(/[. ]/g, "");
    if (title && previous.some(row => skillKey(row.title) === title)) return "duplicate";
    return title && previous.some(row => compact(row.title) === compact(title)) ? "ambiguous" : "";
  }
  let ambiguous = false;
  const duplicate = previous.some(row => {
    const company = key(row.company), title = key(row.title);
    const dates = ["startDate", "endDate"].map(field => educationDateRelation(educationDateIdentity(candidate[field]), educationDateIdentity(row[field])));
    if (company === key(candidate.company) && (!title || !key(candidate.title)) && !dates.includes("different")) { ambiguous = true; return false; }
    if (company !== key(candidate.company) || title !== key(candidate.title)) {
      if (company.replace(/ /g, "") === key(candidate.company).replace(/ /g, "")
        && title.replace(/ /g, "") === key(candidate.title).replace(/ /g, "") && !dates.includes("different")) ambiguous = true;
      if (dates.every(value => value === "equal") && key(candidate.description) && key(candidate.description) === key(row.description)
        && (company === key(candidate.company) || title === key(candidate.title))) ambiguous = true;
      return false;
    }
    if (!company || !title || dates.includes("ambiguous") || dates.includes("different") && dates.includes("equal")) {
      ambiguous = true; return false;
    }
    return dates.every(value => value === "equal");
  });
  return duplicate ? "duplicate" : ambiguous ? "ambiguous" : "";
}
export function cvDraftRows(section, entries) {
  if (section === "education") return educationDraftRows(entries);
  if (!Array.isArray(entries) || entries.length > (section === "skills" ? 40 : 20)) throw Error("Invalid CV draft.");
  const fields = section === "skills" ? ["title", "percent"] : experienceDraftFields;
  return entries.map(entry => {
    const row = Object.fromEntries(fields.map(field => [field, typeof entry[field] === "string" ? entry[field] : ""]));
    return { ...row, ...(entry.cvImport ? { cvImport: entry.cvImport } : {}), selected: true, _sourceKey: cvSourceKey(section, row),
      evidence: Array.isArray(entry.evidence) ? entry.evidence.filter(item => fields.includes(item.field) && typeof item.text === "string" && typeof item.location === "string").slice(0, 10) : [],
      warnings: Array.isArray(entry.warnings) ? entry.warnings.filter(item => typeof item === "string").slice(0, 10) : [] };
  });
}
export function appendCvDraft(section, previous, entries, makeKey, imports = new Map()) {
  if (section === "education") return appendEducationDraft(previous, entries, makeKey, imports);
  const fields = section === "skills" ? ["title", "percent"] : experienceDraftFields;
  const next = entries.some(row => row.selected) ? previous.filter(row => !row._placeholder || fields.some(field => row[field])) : [...previous];
  for (const row of entries.filter(row => row.selected)) {
    const duplicate = cvDuplicate(section, row, next, imports);
    if (["duplicate", "imported"].includes(duplicate) || duplicate === "ambiguous" && !row._duplicateReviewed) continue;
    if (!row.title && section === "skills") continue;
    const editorKey = makeKey();
    next.push({ ...Object.fromEntries(fields.map(field => [field, String(row[field] || "")])), _editorKey: editorKey,
      _sourceIndex: null, ...(row.cvImport ? { cvImport: { ...row.cvImport, reviewedDistinct: Boolean(row._duplicateReviewed) } } : {}) });
    if (row._sourceKey) imports.set(row._sourceKey, editorKey);
  }
  return next;
}
