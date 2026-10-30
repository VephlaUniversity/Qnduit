import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import path from "node:path";
import Talent from "../models/Talent.js";
import Resume from "../models/Resume.js";
import PortfolioSave from "../models/PortfolioSave.js";
import cloudinary from "../utils/cloudinary.js";
import { normalizePortfolioImages, preparePortfolio } from "../utils/resumePortfolio.js";
import { draftHash, editorRevision, prepareTalentDraft } from "../utils/talentPortfolioDraft.js";

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const receiptId = (owner, id) => draftHash([String(owner), id]);
const allowed = ["saveRequestId", "portfolioRevision", "talentItems", "portfolioItems", "keepCvIds", "aboutMe", "videoUrl", "education", "experience", "skills"];
const receipt = (owner, id) => PortfolioSave.collection.findOne({ _id: receiptId(owner, id), talent: owner }, { readConcern: { level: "majority" } });
const respond = (res, state, id) => res.status(state === "pending" ? 202 : state === "failed" ? 409 : 200).json({
  success: state === "committed", saveState: state, saveRequestId: id,
  message: state === "committed" ? "All changes saved successfully." : state === "failed"
    ? "The save did not complete. Your draft is retained; you can try again."
    : "Save status could not be confirmed. Your draft and uploaded files are retained. Check the save status again.",
});

export async function getPortfolioSaveStatus(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  try {
    if (!/^[\w-]{16,100}$/.test(req.params.requestId)) throw fail("Invalid save reference.");
    const saved = await receipt(req.user._id, req.params.requestId);
    // Missing does not prove a request still in flight cannot start/commit later.
    return respond(res, saved?.state || "pending", req.params.requestId);
  } catch (error) { next(error); }
}

export async function savePortfolioPage(req, res) {
  const owner = req.user._id, body = req.body || {}, id = body.saveRequestId;
  const uploaded = [];
  let session, claimed = false, callbackFinished = false;
  const cleanup = async () => {
    for (const asset of uploaded) {
      try { await cloudinary.uploader.destroy(asset.public_id, { resource_type: asset.resourceType }); }
      catch { console.error("Failed to clean up an uncommitted portfolio upload."); }
    }
  };
  try {
    if (typeof id !== "string" || !/^[\w-]{16,100}$/.test(id) || typeof body.portfolioRevision !== "string"
      || !/^[a-f\d]{64}$/.test(body.portfolioRevision) || Object.keys(body).some(key => !allowed.includes(key))) throw fail("Invalid save request.");
    const files = Object.values(req.files || {}).flat();
    const digest = draftHash([Object.entries(body).sort(([a], [b]) => a.localeCompare(b)), files.map(file => [file.fieldname, file.originalname, file.mimetype, draftHash(file.buffer)])]);
    const prior = await receipt(owner, id);
    if (prior) {
      if (prior.digest !== digest) throw fail("This save reference belongs to a different draft.", 409);
      return respond(res, prior.state, id);
    }
    const talent = await Talent.collection.findOne({ _id: owner });
    const stored = await Resume.collection.findOne({ talent: owner });
    if (!talent) throw fail("Talent not found.", 404);
    if (editorRevision(talent, stored) !== body.portfolioRevision) throw fail("Saved data changed in another session. Your draft is retained; compare it with the current saved version before retrying.", 409);
    const talentRows = prepareTalentDraft(body.talentItems, talent.portfolio || [], owner, body.portfolioRevision);
    const images = req.files?.portfolioImages || [], cvFiles = req.files?.cvFiles || [];
    const plan = preparePortfolio(body, normalizePortfolioImages(stored?.portfolioImages, owner), images);
    let keep;
    try { keep = JSON.parse(body.keepCvIds); } catch { throw fail("Invalid retained CV files."); }
    if (!Array.isArray(keep) || keep.some(value => value !== null && typeof value !== "string")) throw fail("Invalid retained CV files.");
    // Old CV entries without media IDs cannot be safely removed by this keep-list protocol.
    const keptCv = (stored?.cvFiles || []).filter(file => !file.public_id || keep.includes(String(file.public_id)));
    if (keptCv.length + cvFiles.length > 5) throw fail("You can keep up to 5 CV files.");
    if (cvFiles.some(file => file.size > 10 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(file.originalname))) throw fail("CV files must be PDF, Doc or Docx, up to 10MB each.");
    const patch = {};
    for (const key of ["education", "experience", "skills"]) if (body[key] !== undefined) {
      try { patch[key] = JSON.parse(body[key]); } catch { throw fail(`Invalid ${key}.`); }
      if (!Array.isArray(patch[key])) throw fail(`Invalid ${key}.`);
    }
    if (body.aboutMe !== undefined) { if (typeof body.aboutMe !== "string") throw fail("Invalid about text."); patch.aboutMe = body.aboutMe; }
    if (body.videoUrl !== undefined) { if (typeof body.videoUrl !== "string") throw fail("Invalid video URL."); patch.introVideo = { url: body.videoUrl, public_id: "" }; }
    // Validate before provider work; persistence below merges raw records, retaining custom fields.
    await new Resume({ ...(stored || {}), ...patch, talent: owner,
      portfolioImages: plan.items.filter(item => item.previous).map(item => ({ ...item.previous, ...item.metadata })), cvFiles: keptCv }).validate();
    try { await PortfolioSave.create({ _id: receiptId(owner, id), talent: owner, digest, state: "pending" }); claimed = true; }
    catch (error) {
      if (error.code !== 11000) throw error;
      const competing = await receipt(owner, id);
      if (competing?.digest !== digest) throw fail("This save reference belongs to a different draft.", 409);
      return respond(res, competing?.state || "pending", id);
    }
    const upload = async (file, resourceType, folder) => {
      const result = await new Promise((resolve, reject) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType, folder, overwrite: false,
          public_id: `${owner}-${randomUUID()}${resourceType === "raw" ? extension : ""}` },
        (error, value) => error ? reject(error) : resolve(value));
        stream.end(file.buffer);
      });
      const asset = { url: result.secure_url, public_id: result.public_id, resourceType };
      uploaded.push(asset);
      return { _id: new mongoose.Types.ObjectId(), url: asset.url, public_id: asset.public_id };
    };
    const addedCv = [];
    for (const file of cvFiles) addedCv.push({ ...await upload(file, "raw", "qnduit/resumes/cv"), name: file.originalname,
      type: /\.pdf$/i.test(file.originalname) ? "PDF" : "Doc" });
    const addedImages = new Map();
    for (const file of images) addedImages.set(file.originalname, await upload(file, "image", "qnduit/resumes/portfolio"));
    patch.cvFiles = [...keptCv, ...addedCv];
    patch.portfolioImages = plan.items.map(item => ({ ...(item.previous || addedImages.get(item.file.originalname)), ...item.metadata }));
    const resumeId = stored?._id || new mongoose.Types.ObjectId();
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      callbackFinished = false;
      const currentTalent = await Talent.collection.findOne({ _id: owner }, { session });
      const currentResume = await Resume.collection.findOne({ talent: owner }, { session });
      if (!currentTalent) throw fail("Talent not found. Your draft is retained.", 404);
      if (editorRevision(currentTalent, currentResume) !== body.portfolioRevision) throw fail("Saved data changed in another session. Your draft is retained; compare it with the current saved version before retrying.", 409);
      const removedCv = (stored?.cvFiles || []).filter(file => !keptCv.includes(file));
      const unsetSignup = removedCv.some(file => file.public_id && file.public_id === currentTalent.resume?.public_id);
      // Increment serializes even first saves with no portfolio changes, preventing duplicate Resume inserts.
      const savedTalent = await Talent.collection.updateOne({ _id: owner }, { $set: { portfolio: talentRows }, $inc: { portfolioSaveVersion: 1 },
        ...(unsetSignup ? { $unset: { resume: "" } } : {}) }, { session });
      if (savedTalent.matchedCount !== 1) throw fail("Talent not found. Your draft is retained.", 409);
      const now = new Date();
      if (stored) {
        const savedResume = await Resume.collection.updateOne({ _id: resumeId, talent: owner }, { $set: { ...patch, updatedAt: now } }, { session });
        if (savedResume.matchedCount !== 1) throw fail("The saved Resume changed. Your draft is retained.", 409);
      }
      else await Resume.collection.insertOne({ _id: resumeId, talent: owner, ...patch, createdAt: now, updatedAt: now }, { session });
      const savedReceipt = await PortfolioSave.collection.updateOne({ _id: receiptId(owner, id), state: "pending" }, { $set: { state: "committed", updatedAt: now } }, { session });
      if (savedReceipt.matchedCount !== 1) throw fail("The save receipt changed. Your draft is retained.", 409);
      callbackFinished = true;
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
    // Stored asset removals are unlink-only. No existing image/CV assets are destroyed here.
    return respond(res, "committed", id);
  } catch (error) {
    if (claimed) {
      let outcome;
      try { outcome = await receipt(owner, id); } catch { /* An unreadable outcome must retain uploads. */ }
      if (outcome?.state === "committed") return respond(res, "committed", id);
      if (callbackFinished || error.hasErrorLabel?.("UnknownTransactionCommitResult")) return respond(res, "pending", id);
      // Callback/upload failure before any commit attempt is a definitive failure.
      try {
        const failedReceipt = await PortfolioSave.collection.updateOne({ _id: receiptId(owner, id), state: "pending" }, { $set: { state: "failed", updatedAt: new Date() } });
        if (failedReceipt.matchedCount !== 1) return respond(res, "pending", id);
      } catch { return respond(res, "pending", id); }
      await cleanup();
    }
    return res.status(error.statusCode || 500).json({ success: false, saveState: "failed", saveRequestId: id,
      message: error.statusCode ? error.message : "The save failed. Your draft is retained. Please try again." });
  } finally { if (session) await session.endSession(); }
}
