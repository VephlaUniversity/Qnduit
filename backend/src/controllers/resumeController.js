import Resume from "../models/Resume.js";
import Talent from "../models/Talent.js";
import multer from "multer";
import path from "path";
import { isDeepStrictEqual } from "node:util";
import cloudinary from "../utils/cloudinary.js";
import { normalizePortfolioImages, preparePortfolio } from "../utils/resumePortfolio.js";
import { editorRevision, talentDraft } from "../utils/talentPortfolioDraft.js";

const storage = multer.memoryStorage();

const MAX_CV_FILES = 5;

// Parses a JSON array of public_ids sent by the client; returns null if absent/invalid.
const parseKeepList = (value) => {
  if (value === undefined || value === null || value === "") return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
};

// Keeps the sign-up upload and the Resume page in sync.
export const addCvToResume = async (
  talentId,
  file,
  { atStart = false } = {},
) => {
  if (!file?.url) return null;
  const stored = await Resume.findOne({ talent: talentId }).lean();
  const resume = stored
    ? Resume.hydrate({ ...stored, portfolioImages: normalizePortfolioImages(stored.portfolioImages, talentId) })
    : new Resume({ talent: talentId });
  const exists = (resume.cvFiles || []).some(
    (item) =>
      item.url === file.url ||
      (file.public_id && item.public_id === file.public_id),
  );
  if (!exists && (resume.cvFiles || []).length < MAX_CV_FILES) {
    // An older sign-up file synced later must not look like the newest upload.
    if (atStart) resume.cvFiles.unshift(file);
    else resume.cvFiles.push(file);
    await resume.save();
  }
  return resume;
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

export const uploadResumeFiles = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "cvFiles") {
      if (![".pdf", ".doc", ".docx"].includes(ext)) {
        return cb(new Error("Only PDF, Doc, Docx allowed"));
      }
    }

    if (file.fieldname === "portfolioImages") {
      if (![".png", ".jpg", ".jpeg"].includes(ext)) {
        return cb(new Error("Only images allowed"));
      }
    }

    cb(null, true);
  },
}).fields([
  { name: "cvFiles", maxCount: 5 },
  { name: "portfolioImages", maxCount: 10 },
]);

// Save or update resume
export const saveResume = async (req, res, next) => {
  const uploadedCVs = [], uploadedImages = [];
  let persisted = false, persistenceAttempted = false;
  try {
    const talentId = req.user._id;

    const stored = await Resume.findOne({ talent: talentId }).lean();
    const existingPortfolio = normalizePortfolioImages(stored?.portfolioImages, talentId);
    const resume = stored
      ? Resume.hydrate({ ...stored, portfolioImages: existingPortfolio })
      : new Resume({ talent: talentId });
    const newImages = req.files?.portfolioImages || [];
    // Validate all project references/metadata and other JSON before provider work.
    const portfolio = preparePortfolio(req.body, existingPortfolio, newImages);
    const parsed = {};
    for (const field of ["education", "experience", "skills"]) {
      if (req.body[field] !== undefined) {
        try { parsed[field] = typeof req.body[field] === "string" ? JSON.parse(req.body[field]) : req.body[field]; }
        catch { throw Object.assign(new Error(`Invalid ${field}.`), { statusCode: 400 }); }
        if (!Array.isArray(parsed[field])) throw Object.assign(new Error(`Invalid ${field}.`), { statusCode: 400 });
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
    const keepCv = parseKeepList(req.body.keepCvIds);
    const existingCv = resume.cvFiles || [];
    const keptCv = keepCv
      ? existingCv.filter((f) => keepCv.includes(String(f.public_id)))
      : existingCv;
    const removedCv = existingCv.filter((f) => !keptCv.includes(f));
    const newCvFiles = req.files?.cvFiles || [];

    if (keptCv.length + newCvFiles.length > MAX_CV_FILES) {
      return res.status(400).json({
        success: false,
        message: `You can keep up to ${MAX_CV_FILES} CV files.`,
      });
    }

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

    // =========================
    // PORTFOLIO IMAGES
    // =========================

    const uploadedByReference = new Map();
    for (const file of newImages) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/resumes/portfolio",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.end(file.buffer);
      });

      const image = { url: uploadResult.secure_url, public_id: uploadResult.public_id };
      uploadedImages.push(image);
      uploadedByReference.set(file.originalname, image);
    }

    resume.portfolioImages = portfolio.items.map(item => ({
      ...(item.previous || uploadedByReference.get(item.file.originalname)),
      ...item.metadata,
    }));

    persistenceAttempted = true;
    try {
      await resume.save();
    } catch {
      // A rejected write can already have committed. Only an exact owner-scoped
      // majority read confirms success; absence/mismatch cannot prove an abort.
      let confirmed;
      try {
        confirmed = await Resume.collection.findOne(
          { _id: resume._id, talent: talentId },
          { readConcern: { level: "majority" } },
        );
      } catch { /* Unavailable confirmation must retain every new asset. */ }
      if (!isDeepStrictEqual(confirmed, resume.toObject())) {
        return res.status(503).json({
          success: false,
          saveState: "pending",
          message: "Save outcome could not be confirmed. Uploaded files are retained. Reload to check your saved data before retrying.",
        });
      }
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
    await removeFromCloudinary(removedCv, "raw");
    // Stored portfolio removals are unlink-only, including legacy clients.


    res.json({
      success: true,
      message: "Resume saved successfully",
      resume,
    });
  } catch (error) {
    // A post-save housekeeping error must never remove assets now referenced in DB.
    if (!persisted && !persistenceAttempted) {
      await removeFromCloudinary(uploadedCVs, "raw");
      await removeFromCloudinary(uploadedImages, "image");
    }
    next(error);
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
    if (!resume?.cvFiles?.length) {
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
      resume: { ...(record || {}), portfolioImages: normalizePortfolioImages(record?.portfolioImages, talentId) },
      portfolioRevision: revision,
      talentProjects: talentDraft(talent?.portfolio || [], talentId, revision),
    });
  } catch (error) {
    next(error);
  }
};
