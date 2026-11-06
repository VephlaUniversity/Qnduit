import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "node:process";
import { Buffer } from "node:buffer";
import { cvSourceKey, cvDuplicate } from "./cvDraft.js";

const digest = source => {
  const identity = JSON.parse(source); delete identity.mappedTitle;
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
};
const sign = (owner, section, sourceKey) => createHmac("sha256", env.JWT_SECRET)
  .update(JSON.stringify([String(owner), section, sourceKey])).digest("hex");
export function attachCvProof(owner, section, row) {
  const sourceKey = cvSourceKey(section, row);
  if (sourceKey.length > 5000) throw Object.assign(new Error("CV source exceeds extraction limits."), { code: "RESOURCE_LIMIT" });
  return { ...row, cvImport: { sourceKey, key: digest(sourceKey), proof: sign(owner, section, sourceKey) } };
}
export function validateCvImports(owner, section, rows, previous = []) {
  const accepted = [];
  for (const row of rows) {
    const metadata = row?.cvImport;
    if (metadata) {
      // Provenance authenticates the source identity, not the user's editable
      // fields. Keep the existing manual-field/schema saving contract intact.
      let valid = false;
      try {
        const retained = previous.some(old => old.cvImport?.key === metadata.key && old.cvImport?.sourceKey === metadata.sourceKey && old.cvImport?.proof === metadata.proof);
        valid = typeof metadata.sourceKey === "string" && metadata.sourceKey.length <= 5000
          && metadata.key === digest(metadata.sourceKey) && /^[a-f\d]{64}$/.test(metadata.proof)
          && (retained || timingSafeEqual(Buffer.from(metadata.proof, "hex"), Buffer.from(sign(owner, section, metadata.sourceKey), "hex")));
      } catch { /* Invalid provenance is rejected without logging its contents. */ }
      if (!valid) throw Object.assign(new Error("This CV suggestion is no longer valid for this account. Extract it again."), { statusCode: 400 });
      const existing = previous.find(old => old.cvImport?.key === metadata.key);
      // A retained imported row can be edited, but the same source cannot add a second row.
      if (accepted.filter(old => old.cvImport?.key === metadata.key).length >= Math.max(1, previous.filter(old => old.cvImport?.key === metadata.key).length)) {
        throw Object.assign(new Error("A CV suggestion is repeated. Review the draft before saving."), { statusCode: 409 });
      }
      if (!existing) {
        const duplicate = cvDuplicate(section, row, [...previous, ...accepted]);
        if (["duplicate", "imported"].includes(duplicate) || duplicate === "ambiguous" && metadata.reviewedDistinct !== true) {
          throw Object.assign(new Error("A CV suggestion may already be saved. Review the existing entry before saving."), { statusCode: 409 });
        }
      }
    }
    accepted.push(row);
  }
  return rows;
}

// Legacy Experience/Skill rows need the same positional/identity preservation as
// education; editor keys are transient and never replace stored IDs.
export function prepareCvEntries(rows, previous = []) {
  const used = new Set();
  return rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw Object.assign(new Error("Invalid CV entry."), { statusCode: 400 });
    const identity = value => value?._id != null ? `_id:${value._id}` : value?.id != null ? `id:${value.id}` : null;
    let at;
    if (identity(row)) {
      const matches = previous.flatMap((old, i) => identity(old) === identity(row) ? [i] : []);
      if (matches.length > 1) throw Object.assign(new Error("Ambiguous stored CV entry identity."), { statusCode: 400 });
      at = matches[0];
    } else if (row._sourceIndex !== undefined && row._sourceIndex !== null) at = row._sourceIndex;
    else if (!Object.hasOwn(row, "_sourceIndex") && index < previous.length && !identity(previous[index])) at = index;
    if (at !== undefined && (!Number.isInteger(at) || at < 0 || at >= previous.length || used.has(at))) throw Object.assign(new Error("Invalid CV entry source."), { statusCode: 400 });
    if (at !== undefined) used.add(at);
    const source = at === undefined ? undefined : previous[at];
    const value = { ...row }; delete value._editorKey; delete value._sourceIndex;
    if (source) for (const field of ["company", "title", "startDate", "endDate", "description", "percent"]) {
      if (!Object.hasOwn(source, field) && value[field] === "") delete value[field];
    }
    if (source) for (const field of Object.keys(source)) {
      if (JSON.stringify(source[field]) === JSON.stringify(value[field])) value[field] = source[field];
    }
    return source ? { ...source, ...value, ...(source._id != null ? { _id: source._id } : {}), ...(source.id != null ? { id: source.id } : {}) } : value;
  });
}
