import Resume from "../models/Resume.js";
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "cvFiles") {
      cb(null, "uploads/resumes/");
    } else if (file.fieldname === "portfolioImages") {
      cb(null, "uploads/portfolio/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

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

    // Find existing resume
    let resume = await Resume.findOne({ talent: talentId });
    if (!resume) resume = new Resume({ talent: talentId });

    // CVs
    if (req.files) {
      if (req.files.cvFiles) {
        resume.cvFiles = req.files.cvFiles.map(file => ({
          url: `/uploads/resumes/${file.filename}`,
          public_id: file.filename,
          type: path.extname(file.filename).toLowerCase() === ".pdf" ? "PDF" : "Doc",
        }));
      }
      if (req.files.portfolioImages) {
        resume.portfolioImages = req.files.portfolioImages.map(file => ({
          url: `/uploads/portfolio/${file.filename}`,
          public_id: file.filename,
        }));
      }
    }

    // Other data
    const { aboutMe, videoUrl, education, experience, skills } = req.body;

    if (aboutMe) resume.aboutMe = aboutMe;
    if (videoUrl) resume.introVideo = { url: videoUrl, public_id: "" };
    if (education) resume.education = JSON.parse(education);
    if (experience) resume.experience = JSON.parse(experience);
    if (skills) resume.skills = JSON.parse(skills);

    await resume.save();

    res.json({ success: true, message: "Resume saved successfully", resume });
  } catch (error) {
    next(error);
  }
};

// Get resume
export const getResume = async (req, res, next) => {
  try {
    const talentId = req.user._id;
    const resume = await Resume.findOne({ talent: talentId });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ success: true, resume });
  } catch (error) {
    next(error);
  }
};