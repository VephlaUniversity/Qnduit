import Resume from "../models/Resume.js";
import Talent from "../models/Talent.js";
import multer from "multer";
import path from "path";
import cloudinary from "../utils/cloudinary.js";

const storage = multer.memoryStorage();

const MAX_CV_FILES = 5;
const MAX_PORTFOLIO_IMAGES = 10;

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
export const addCvToResume = async (talentId, file) => {
  if (!file?.url) return null;
  let resume = await Resume.findOne({ talent: talentId });
  if (!resume) resume = new Resume({ talent: talentId });
  const exists = (resume.cvFiles || []).some(
    (item) =>
      item.url === file.url ||
      (file.public_id && item.public_id === file.public_id),
  );
  if (!exists && (resume.cvFiles || []).length < MAX_CV_FILES) {
    resume.cvFiles.push(file);
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
  try {
    const talentId = req.user._id;

    let resume = await Resume.findOne({ talent: talentId });

    if (!resume) {
      resume = new Resume({ talent: talentId });
    }

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

    const uploadedCVs = [];

    for (const file of newCvFiles) {
      const extension = path.extname(file.originalname).toLowerCase();

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/resumes/cv",
            resource_type: "raw",
            public_id: `${talentId}-${Date.now()}-${path.basename(
              file.originalname,
              extension,
            )}`,
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

    const keepPortfolio = parseKeepList(req.body.keepPortfolioIds);
    const existingPortfolio = resume.portfolioImages || [];
    const keptPortfolio = keepPortfolio
      ? existingPortfolio.filter((f) =>
          keepPortfolio.includes(String(f.public_id)),
        )
      : existingPortfolio;
    const removedPortfolio = existingPortfolio.filter(
      (f) => !keptPortfolio.includes(f),
    );
    const newImages = req.files?.portfolioImages || [];

    if (keptPortfolio.length + newImages.length > MAX_PORTFOLIO_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `You can keep up to ${MAX_PORTFOLIO_IMAGES} portfolio images.`,
      });
    }

    const uploadedImages = [];

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

      uploadedImages.push({
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    }

    resume.portfolioImages = [...keptPortfolio, ...uploadedImages];

    // =========================
    // OTHER DATA
    // =========================

    const { aboutMe, videoUrl, education, experience, skills } = req.body;

    if (aboutMe !== undefined) {
      resume.aboutMe = aboutMe;
    }

    if (videoUrl !== undefined) {
      resume.introVideo = {
        url: videoUrl,
        public_id: "",
      };
    }

    if (education) {
      resume.education = JSON.parse(education);
    }

    if (experience) {
      resume.experience = JSON.parse(experience);
    }

    if (skills) {
      resume.skills = JSON.parse(skills);
    }

    await resume.save();

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
    await removeFromCloudinary(removedPortfolio, "image");

    res.json({
      success: true,
      message: "Resume saved successfully",
      resume,
    });
  } catch (error) {
    next(error);
  }
};

// Get resume
export const getResume = async (req, res, next) => {
  try {
    const talentId = req.user._id;

    let resume = await Resume.findOne({
      talent: talentId,
    });

    // Talents who uploaded a resume at sign-up (before the two were linked) get
    // that file added to their Resume page the first time they open it.
    if (!resume?.cvFiles?.length) {
      const talent = await Talent.findById(talentId).select("resume").lean();
      if (talent?.resume?.url) {
        const ext = path.extname(talent.resume.url.split("?")[0]).toLowerCase();
        resume =
          (await addCvToResume(talentId, {
            url: talent.resume.url,
            public_id: talent.resume.public_id,
            type: ext === ".pdf" ? "PDF" : "Doc",
            name: `Resume${ext}`,
          })) || resume;
      }
    }

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found",
      });
    }

    res.json({
      success: true,
      resume,
    });
  } catch (error) {
    next(error);
  }
};
