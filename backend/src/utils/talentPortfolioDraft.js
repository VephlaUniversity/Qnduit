import { createHash, createHmac, randomUUID } from "node:crypto";
import { env } from "node:process";
import mongoose from "mongoose";
import { portfolioMetadata } from "./portfolioMetadata.js";

const { EJSON } = mongoose.mongo.BSON;
export const draftHash = value => createHash("sha256").update(EJSON.stringify(value, { relaxed: false })).digest("hex");
export const editorRevision = (talent, resume) => draftHash([talent?.portfolio || [], resume || null]);
const reference = (owner, revision, index) => createHmac("sha256", env.JWT_SECRET)
  .update(JSON.stringify([String(owner), "talent", revision, index])).digest("hex");
const text = value => typeof value === "string" ? value : "";
const fail = message => Object.assign(new Error(message), { statusCode: 400 });

export function talentDraft(rows = [], owner, revision) {
  const ids = rows.map(row => row?.portfolioItemId || (row?._id ? String(row._id) : ""));
  return rows.map((row, index) => ({
    ref: reference(owner, revision, index),
    id: ids[index] && ids.indexOf(ids[index]) === ids.lastIndexOf(ids[index]) ? ids[index] : reference(owner, revision, index),
    title: text(row?.title), imageUrl: typeof row === "string" ? row : text(row?.imageUrl),
    description: text(row?.description), projectUrl: text(row?.projectUrl),
    skills: Array.isArray(row?.skills) ? row.skills.filter(value => typeof value === "string") : [],
  }));
}

export function prepareTalentDraft(value, rows, owner, revision) {
  let supplied;
  try { supplied = typeof value === "string" ? JSON.parse(value) : value; }
  catch { throw fail("Invalid Talent project details."); }
  if (!Array.isArray(supplied) || supplied.length !== rows.length) throw fail("Every Talent project must be retained or explicitly removed.");
  const known = talentDraft(rows, owner, revision), byRef = new Map();
  for (const item of supplied) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.ref !== "string"
      || byRef.has(item.ref) || !known.some(row => row.ref === item.ref)
      || Object.keys(item).some(key => !["ref", "remove", "description", "projectUrl", "skills"].includes(key))
      || (item.remove !== undefined && typeof item.remove !== "boolean")) throw fail("Invalid owner or source reference for a Talent project.");
    byRef.set(item.ref, item);
  }
  return rows.flatMap((raw, index) => {
    const item = byRef.get(known[index].ref);
    if (item.remove) return [];
    if (typeof raw !== "string" && (!raw || typeof raw !== "object" || Array.isArray(raw))) throw fail("Unsupported legacy project format. Your saved entry is unchanged.");
    const row = typeof raw === "string" ? { imageUrl: raw, legacyImageValue: raw } : { ...raw };
    if (row.portfolioItemId !== undefined && (typeof row.portfolioItemId !== "string" || !row.portfolioItemId)) throw fail("This project's stored identity needs review. No data was changed.");
    // A separate identity preserves even duplicate legacy _ids and every custom field.
    if (!row.portfolioItemId) row.portfolioItemId = randomUUID();
    const duplicates = rows.filter(other => other?.portfolioItemId === row.portfolioItemId);
    if (duplicates.length > 1) throw fail("Duplicate stored project identities need review. No data was changed.");
    let metadata;
    try { metadata = portfolioMetadata(item); } catch (error) { throw fail(error.message); }
    return [{ ...row, ...metadata }];
  });
}
