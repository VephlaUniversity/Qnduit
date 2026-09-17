import Resume from "../models/Resume.js";
import multer from "multer";
import path from "path";
import cloudinary from "../utils/cloudinary.js";

const storage = multer.memoryStorage();

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

    if (req.files?.cvFiles) {
      const uploadedCVs = [];

      for (const file of req.files.cvFiles) {
        const extension = path
          .extname(file.originalname)
          .toLowerCase();

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "qnduit/resumes/cv",
              resource_type: "raw",
              public_id: `${talentId}-${Date.now()}-${path.basename(
                file.originalname,
                extension
              )}`,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          stream.end(file.buffer);
        });

        uploadedCVs.push({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          type: extension === ".pdf" ? "PDF" : "Doc",
        });
      }

      resume.cvFiles = uploadedCVs;
    }


    // =========================
    // PORTFOLIO IMAGES
    // =========================

    if (req.files?.portfolioImages) {
      const uploadedImages = [];

      for (const file of req.files.portfolioImages) {
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
            }
          );

          stream.end(file.buffer);
        });

        uploadedImages.push({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        });
      }

      resume.portfolioImages = uploadedImages;
    }


    // =========================
    // OTHER DATA
    // =========================

    const {
      aboutMe,
      videoUrl,
      education,
      experience,
      skills,
    } = req.body;

    if (aboutMe) {
      resume.aboutMe = aboutMe;
    }

    if (videoUrl) {
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

    const resume = await Resume.findOne({
      talent: talentId,
    });

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