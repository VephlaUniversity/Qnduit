import { createHash } from "node:crypto";

const fail = message => Object.assign(new Error(message), { statusCode: 400 });
// Owner-scoped source references include array position, so duplicate/missing IDs
// in legacy records still require an unambiguous, explicit selection.
export const cvReference = (owner, file, index) => createHash("sha256")
  .update(JSON.stringify([String(owner), index, file?._id ? String(file._id) : null, file?.public_id, file?.url])).digest("hex");

export function selectSingleCv(owner, existing, files, body) {
  if (files.length > 1) throw fail("Choose one CV. Replace the active CV explicitly.");
  if (body.cvSelection !== undefined) {
    let selection;
    try { selection = JSON.parse(body.cvSelection); } catch { throw fail("Choose the CV to retain or explicitly replace it."); }
    if (!selection || !["keep", "replace", "remove"].includes(selection.action)) throw fail("Invalid CV choice.");
    if (existing.length > 1 && (selection.action !== "keep" || files.length)) throw fail("Choose one saved CV to retain, then Save Changes before replacing or removing it.");
    if (selection.action === "replace") {
      if (files.length !== 1) throw fail("Select one replacement CV.");
      return [];
    }
    if (files.length) throw fail("Confirm replacement before uploading a new CV.");
    if (selection.action === "remove") return [];
    const matches = existing.filter((file, index) => cvReference(owner, file, index) === selection.ref);
    if (existing.length === 0 && selection.ref === null) return [];
    if (matches.length !== 1) throw fail("Choose which saved CV to retain.");
    return matches;
  }
  // Compatibility with older clients: initial upload/unchanged single CV only.
  // Legacy multi-CV lists cannot be silently reduced using a public_id keep list.
  if (existing.length > 1) throw fail("Multiple saved CVs need your choice. Choose one to retain in Resumes.");
  let keep = existing;
  if (body.keepCvIds !== undefined) {
    let ids;
    try { ids = JSON.parse(body.keepCvIds); } catch { throw fail("Invalid retained CV files."); }
    if (!Array.isArray(ids)) throw fail("Invalid retained CV files.");
    keep = existing.filter(file => !file.public_id || ids.includes(String(file.public_id)));
  }
  if (files.length && existing.length) throw fail("Confirm replacement in Resumes before uploading another CV.");
  return keep;
}
