import { prepareEducation } from "../utils/talentFieldChoices.js";
import Resume from "../models/Resume.js";
import Talent from "../models/Talent.js";
import multer from "multer";
import mongoose from "mongoose";
import path from "path";
import cloudinary from "../utils/cloudinary.js";
import { normalizePortfolioImages, preparePortfolio } from "../utils/resumePortfolio.js";
import { editorRevision, talentDraft } from "../utils/talentPortfolioDraft.js";
import { selectSingleCv, cvReference } from "../utils/singleCv.js";
import { validateCvImports, prepareCvEntries } from "../utils/cvImportProof.js";
import { enforcePortfolioLimit } from "../services/portfolioPolicy.js";
import { Buffer } from "node:buffer";
import { materializePortfolioProject, MAX_PORTFOLIO_REQUEST_BYTES, uploadPortfolioAsset, validatePortfolioImageBytes } from "../utils/portfolioGallery.js";
import { normalizePortfolioCaseStudy } from "../utils/portfolioCaseStudy.js";
import { MAX_PORTFOLIO_FIELD_BYTES } from "../utils/portfolioMetadata.js";

// Bound the entire multipart file payload while streaming, before memoryStorage
// could allocate every permitted file. Keep the existing 20-image/one-CV count.
const uploadBytes = Symbol("resumeUploadBytes");
const storage = {
  _handleFile(req, file, callback) {
    let chunks = [], size = 0, finished = false;
    const done = (error, result) => {
      if (finished) return;
      finished = true;
      chunks = [];
      callback(error, result);
    };
    file.stream.on("data", chunk => {
      if (finished) return;
      size += chunk.length;
      req[uploadBytes] = (req[uploadBytes] || 0) + chunk.length;
      const limit = file.fieldname === "portfolioImages" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (size > limit || req[uploadBytes] > MAX_PORTFOLIO_REQUEST_BYTES) {
        done(Object.assign(new Error("Uploads exceed the per-file limit or combined 30 MiB request limit."), { statusCode: 413 }));
      } else chunks.push(chunk);
    });
    file.stream.once("error", done);
    file.stream.once("end", () => {
      if (!finished) done(null, { buffer: Buffer.concat(chunks), size });
    });
  },
  _removeFile(req, file, callback) { delete file.buffer; callback(null); },
};

// Keeps the sign-up upload and the Resume page in sync.
export const addCvToResume = async (
  talentId,
  file,
  { atStart = false } = {},
) => {
  if (!file?.url) return null;
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      if (await Resume.collection.countDocuments({ talent: talentId }, { session, limit: 2 }) > 1) throw Object.assign(new Error("Multiple saved Resume records need review. No CV was changed."), { statusCode: 409 });
      const stored = await Resume.collection.findOne({ talent: talentId }, { session });
      if (stored?.cvFiles?.length) {
        if (atStart || stored.cvFiles.length === 1 && file.contentHash && stored.cvFiles[0].contentHash === file.contentHash
          || stored.cvFiles.some(item => item.url === file.url || file.public_id && item.public_id === file.public_id)) { result = stored; return; }
        throw Object.assign(new Error("A CV is already saved. Replace it explicitly on the Resumes page."), { statusCode: 409 });
      }
      const entry = { ...file, _id: new mongoose.Types.ObjectId() };
      const update = await Talent.collection.updateOne({ _id: talentId }, { $inc: { cvPolicyVersion: 1 },
        ...(!atStart ? { $set: { resume: { url: file.url, public_id: file.public_id } } } : {}) }, { session });
      if (update.matchedCount !== 1) throw Object.assign(new Error("Talent not found."), { statusCode: 404 });
      if (stored) await Resume.collection.updateOne({ _id: stored._id }, { $set: { cvFiles: [entry], updatedAt: new Date() } }, { session });
      else await Resume.collection.insertOne({ talent: talentId, cvFiles: [entry], createdAt: new Date(), updatedAt: new Date() }, { session });
      result = await Resume.collection.findOne({ talent: talentId }, { session });
    });
    return result;
  } finally { await session.endSession(); }

};

// Best-effort removal from Cloudinary
const removeFromCloudinary = async (items, resourceType) => {
  for (const item of items) {
    if (!item?.public_id) continue;
    try {
      await cloudinary.uploader.destroy(item.public_id, {
        resource_type: resourceType,
      });
    } catch (error) {
      console.error("Cloudinary delete failed:", item.public_id, error.message);
    }
  }
};

const resumeUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 21, fields: 16, parts: 38, fieldSize: MAX_PORTFOLIO_FIELD_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "cvFiles") {
      if (![".pdf", ".doc", ".docx"].includes(ext)) {
        return cb(new Error("Only PDF, Doc, Docx allowed"));
      }
    }

    if (file.fieldname === "portfolioImages") {
      if (![".png", ".jpg", ".jpeg"].includes(ext) || !["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype)) {
        return cb(new Error("Only images allowed"));
      }
    }

    cb(null, true);
  },
}).fields([
  { name: "cvFiles", maxCount: 1 },
  { name: "portfolioImages", maxCount: 20 },
]);
export const uploadResumeFiles = (req, res, next) => resumeUpload(req, res, error => {
  if (error) {
    // This middleware precedes both save controllers: no receipt, upload to the
    // provider, or transaction can exist for this rejected request.
    const metadataTooLarge = error.code === "LIMIT_FIELD_VALUE";
    const message = metadataTooLarge
      ? "Each metadata field must be smaller than 1 MiB. Save fewer project changes at once. Your draft and images are retained."
      : error.statusCode === 413 ? error.message
        : error.code === "LIMIT_FILE_SIZE" ? "Choose files of 10 MiB or smaller."
          : error.field === "cvFiles" ? "Choose one CV. Replace the active CV explicitly." : "The selected files could not be accepted.";
    return next(Object.assign(new Error(message), {
      statusCode: metadataTooLarge || error.statusCode === 413 ? 413 : 400,
      code: "PORTFOLIO_MULTIPART_REJECTED", saveState: "failed",
    }));
  }
  next();
});

// Save or update resume
export const saveResume = async (req, res, next) => {
  const uploadedCVs = [], uploadedImages = [];
  let persisted = false, callbackFinished = false, session;
  try {
    const talentId = req.user._id;

    const talent = await Talent.collection.findOne({ _id: talentId });
    const stored = await Resume.collection.findOne({ talent: talentId });
    if (!talent)
      throw Object.assign(
        new Error("Talent not found."),
        { statusCode: 404 },
      );
    if (await Resume.collection.countDocuments({ talent: talentId }, { limit: 2 }) > 1) {
      throw Object.assign(
        new Error("Multiple saved Resume records need review. No data was changed."),
        { statusCode: 409 },
      );
    }
    const newImages = req.files?.portfolioImages || [];
    const changesPortfolio = Object.hasOwn(req.body, "portfolioItems") ||
      Object.hasOwn(req.body, "keepPortfolioIds") || newImages.length > 0;
    const submittedRevision = req.body.portfolioRevision;
    if (
      (changesPortfolio || Object.hasOwn(req.body, "portfolioRevision")) &&
      (typeof submittedRevision !== "string" || !/^[a-f\d]{64}$/.test(submittedRevision))
    ) {
      throw Object.assign(
        new Error("Provide a valid portfolioRevision from GET /api/resume before changing portfolio projects. Your draft is retained."),
        { statusCode: 400 },
      );
    }
    // Portfolio writes must use the owner's original draft revision. Field-only
    // legacy saves retain their existing request-time concurrency protection.
    const revision = submittedRevision ?? editorRevision(talent, stored);
    if (revision !== editorRevision(talent, stored)) {
      throw Object.assign(
        new Error("This profile was updated elsewhere. Your draft is safe. Review changes before retrying."),
        { statusCode: 409 },
      );
    }
    if (req.files?.cvFiles?.length) {
      throw Object.assign(new Error("Use Save Changes on the Resumes page to save CV changes with revision protection."), { statusCode: 409 });
    }
    const existingPortfolio = normalizePortfolioImages(stored?.portfolioImages, talentId);
    const resume = stored
      ? Resume.hydrate({ ...stored, portfolioImages: existingPortfolio })
      : new Resume({ talent: talentId });
    // Validate all project references/metadata and other JSON before provider work.
    const portfolio = preparePortfolio(req.body, existingPortfolio, newImages);
    await enforcePortfolioLimit({
      owner: talentId,
      talent,
      resume: stored,
      talentProjects: talent.portfolio,
      resumeProjects: portfolio.items,
    });
    await validatePortfolioImageBytes(newImages);
    const parsed = {};
    for (const field of ["education", "experience", "skills"]) {
      if (req.body[field] !== undefined) {
        try { parsed[field] = typeof req.body[field] === "string" ? JSON.parse(req.body[field]) : req.body[field]; }
        catch { throw Object.assign(new Error(`Invalid ${field}.`), { statusCode: 400 }); }
        if (!Array.isArray(parsed[field])) throw Object.assign(new Error(`Invalid ${field}.`), { statusCode: 400 });
        if (field === "education") parsed[field] = prepareEducation(parsed[field], stored?.education || []);
        else parsed[field] = prepareCvEntries(parsed[field], stored?.[field] || []);
        validateCvImports(talentId, field, parsed[field], stored?.[field] || []);
        resume[field] = parsed[field];
      }
    }
    if (req.body.aboutMe !== undefined) resume.aboutMe = req.body.aboutMe;
    if (req.body.videoUrl !== undefined) resume.introVideo = { url: req.body.videoUrl, public_id: "" };
    await resume.validate();

    // =========================
    // CV FILES
    // =========================

    // The client sends the public_ids of files it wants to keep. Everything else
    // is removed, and newly uploaded files are added. If the list is missing
    // (older client) existing files are kept and new ones are appended.
    const existingCv = resume.cvFiles || [];
    const newCvFiles = req.files?.cvFiles || [];
    const keptCv = selectSingleCv(talentId, existingCv, newCvFiles, req.body);
    if (existingCv.length && (keptCv.length !== existingCv.length || newCvFiles.length)) {
      throw Object.assign(new Error("Use Save Changes on the Resumes page to confirm CV changes safely."), { statusCode: 409 });
    }
    const removedCv = existingCv.filter((f) => !keptCv.includes(f));

    for (const file of newCvFiles) {
      const extension = path.extname(file.originalname).toLowerCase();

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/resumes/cv",
            resource_type: "raw",
            // Keep the extension so the stored link opens and saves as a real PDF/Word file.
            public_id: `${talentId}-${Date.now()}-${path.basename(
              file.originalname,
              extension,
            )}${extension}`,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.on("error", reject);
        stream.end(file.buffer);
      });

      uploadedCVs.push({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        type: extension === ".pdf" ? "PDF" : "Doc",
        name: file.originalname,
      });
    }

    resume.cvFiles = [...keptCv, ...uploadedCVs];
    resume.cvArchive = [...(stored?.cvArchive || []), ...removedCv];

    // =========================
    // PORTFOLIO IMAGES
    // =========================

    const uploadedByReference = new Map();
    for (const file of newImages) {
      const image = await uploadPortfolioAsset(file, {
        owner: talentId, folder: "qnduit/resumes/portfolio",
      }, asset => uploadedImages.push(asset));
      uploadedByReference.set(file.originalname, image);
    }

    const finalPortfolio = portfolio.items.map(item => ({
      ...materializePortfolioProject(item.project, portfolio.context, uploadedByReference, "url", item.file?.originalname),
      _id: item.previous?._id || new mongoose.Types.ObjectId(),
    }));
    resume.portfolioImages = finalPortfolio;
    await resume.validate();
    const serialized = resume.toObject();
    // A field-only legacy request cannot replace or normalize stored projects.
    const patch = changesPortfolio ? { portfolioImages: finalPortfolio } : {};
    for (const field of ["education", "experience", "skills", "aboutMe"]) {
      if (req.body[field] !== undefined) patch[field] = serialized[field];
    }
    if (req.body.videoUrl !== undefined) patch.introVideo = serialized.introVideo;
    session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        callbackFinished = false;
        const currentTalent = await Talent.collection.findOne({ _id: talentId }, { session });
        const currentResume = await Resume.collection.findOne({ talent: talentId }, { session });
        if (!currentTalent)
          throw Object.assign(
            new Error("Talent not found. Your draft is retained."),
            { statusCode: 404 },
          );
        if (await Resume.collection.countDocuments({ talent: talentId }, { session, limit: 2 }) > 1) {
          throw Object.assign(
            new Error("Multiple saved Resume records need review. No data was changed."),
            { statusCode: 409 },
          );
        }
        if (editorRevision(currentTalent, currentResume) !== revision) {
          throw Object.assign(
            new Error("This profile was updated elsewhere. Your draft is safe. Review changes before retrying."),
            { statusCode: 409 },
          );
        }
        await enforcePortfolioLimit({
          owner: talentId,
          talent: currentTalent,
          resume: currentResume,
          talentProjects: currentTalent.portfolio,
          resumeProjects: finalPortfolio,
          session,
        });
        // The same document serializes unified saves, legacy saves and initial CV
        // creation. A conflicting first insert retries against the new Resume.
        const savedTalent = await Talent.collection.updateOne(
          { _id: talentId },
          { $inc: { portfolioSaveVersion: 1 } },
          { session },
        );
        if (savedTalent.matchedCount !== 1)
          throw Object.assign(
            new Error("Talent not found. Your draft is retained."),
            { statusCode: 409 },
          );
        const now = new Date();
        if (stored) {
          const savedResume = await Resume.collection.updateOne(
            { _id: stored._id, talent: talentId },
            { $set: { ...patch, updatedAt: now } },
            { session },
          );
          if (savedResume.matchedCount !== 1)
            throw Object.assign(
              new Error("The saved Resume changed. Your draft is retained."),
              { statusCode: 409 },
            );
        } else {
          await Resume.collection.insertOne(
            { ...serialized, ...patch, createdAt: now, updatedAt: now },
            { session },
          );
        }
        resume.updatedAt = now;
        if (!stored) resume.createdAt = now;
        callbackFinished = true;
      }, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      });
    } catch (error) {
      // Never destroy uploads when the commit outcome is uncertain. There is no
      // legacy receipt protocol; retain the existing reload-to-confirm response.
      if (callbackFinished || error.hasErrorLabel?.("UnknownTransactionCommitResult")) {
        return res.status(503).json({
          success: false,
          saveState: "pending",
          message: "Save outcome could not be confirmed. Uploaded files are retained. Reload to check your saved data before retrying.",
        });
      }
      throw error;
    }
    persisted = true;

    // If the removed file was the sign-up resume, clear that copy too so it is
    // not shown again or sent to employers.
    const removedIds = removedCv.map((f) => f.public_id).filter(Boolean);
    if (removedIds.length) {
      await Talent.updateOne(
        { _id: talentId, "resume.public_id": { $in: removedIds } },
        { $unset: { resume: "" } },
      );
    }

    // Only after the save succeeded: delete files the user removed.
    // CV replacement/removal is unlink-only. Retain every previous storage asset.
    // Stored portfolio removals are unlink-only, including legacy clients.

    res.json({
      success: true,
      message: "Resume saved successfully",
      resume: { ...resume.toObject(), portfolioImages: normalizePortfolioImages(finalPortfolio, talentId).map(normalizePortfolioCaseStudy) },
    });
  } catch (error) {
    // A post-save housekeeping error must never remove assets now referenced in DB.
    if (!persisted && !callbackFinished) {
      await removeFromCloudinary(uploadedCVs, "raw");
      await removeFromCloudinary(uploadedImages, "image");
    }
    if (error.code === "PORTFOLIO_PROJECT_LIMIT") return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      limit: error.limit,
      currentCount: error.currentCount,
      projectCount: error.projectCount,
    });
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

// Get resume
export const getResume = async (req, res, next) => {
  try {
    const talentId = req.user._id;

    let resume = await Resume.findOne({
      talent: talentId,
    }).lean();

    // Talents who uploaded a resume at sign-up (before the two were linked) get
    // that file added to their Resume page the first time they open it.
    if (!resume) {
      const talent = await Talent.findById(talentId).select("resume").lean();
      if (talent?.resume?.url) {
        const ext = path.extname(talent.resume.url.split("?")[0]).toLowerCase();
        resume =
          (await addCvToResume(
            talentId,
            {
              url: talent.resume.url,
              public_id: talent.resume.public_id,
              type: ext === ".pdf" ? "PDF" : "Doc",
              name: `Resume${ext}`,
            },
            { atStart: true },
          )) || resume;
      }
    }

    const record = await Resume.collection.findOne({ talent: talentId });
    const talent = await Talent.collection.findOne({ _id: talentId }, { projection: { portfolio: 1 } });
    const revision = editorRevision(talent, record);
    res.set("Cache-Control", "private, no-store");
    res.json({
      success: true,
      resume: { ...(record || {}), portfolioImages: normalizePortfolioImages(record?.portfolioImages, talentId).map(normalizePortfolioCaseStudy) },
      cvChoices: (record?.cvFiles || []).map((file, index) => ({ ref: cvReference(talentId, file, index), index })),
      portfolioRevision: revision,
      talentProjects: talentDraft(talent?.portfolio || [], talentId, revision),
    });
  } catch (error) {
    next(error);
  }
};
