import Talent from "../models/Talent.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/resumes/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      return cb(new Error("Only .pdf, .doc, and .docx files are allowed"));
    }
    cb(null, true);
  },
});


export const registerTalent = async (req, res, next) => {
  try {
    const { email, firstName, lastName, password } = req.body;

    const existingTalent = await Talent.findOne({ email });
    if (existingTalent)
      return res.status(400).json({ message: "Email already registered" });

    // Generate a 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const talent = await Talent.create({
      email,
      firstName,
      lastName,
      password,
      verificationCode,
    });

    // ********Send this via email service (SendGrid, Nodemailer, etc.)********
    console.log(`📩 Verification code for ${email}: ${verificationCode}`);

    res.status(201).json({
      success: true,
      message: "Talent registered successfully. Verification code sent.",
      talentId: talent._id,
    });
  } catch (error) {
    next(error);
  }
};


export const verifyTalentEmail = async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;

    const talent = await Talent.findOne({ email });
    if (!talent)
      return res.status(404).json({ message: "Talent not found" });

    if (talent.verificationCode !== verificationCode)
      return res.status(400).json({ message: "Invalid verification code" });

    talent.isVerified = true;
    talent.verificationCode = null;
    await talent.save();

    res.json({
      success: true,
      message: "Email verified successfully.",
      token: generateToken(talent._id),
    });
  } catch (error) {
    next(error);
  }
};

 
export const updateTalentProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (req.file) {
      updates.resume = `/uploads/resumes/${req.file.filename}`;
    }

    const talent = await Talent.findByIdAndUpdate(id, updates, { new: true });
    if (!talent) return res.status(404).json({ message: "Talent not found" });

    res.json({
      success: true,
      message: "Profile updated successfully",
      talent,
    });
  } catch (error) {
    next(error);
  }
};


export const selectTalentPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedPlan } = req.body;

    const talent = await Talent.findById(id);
    if (!talent) return res.status(404).json({ message: "Talent not found" });

    talent.selectedPlan = selectedPlan;
    await talent.save();

    res.json({
      success: true,
      message: `Plan '${selectedPlan}' selected successfully`,
      talent,
    });
  } catch (error) {
    next(error);
  }
};

 
export const getTalentDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const talent = await Talent.findById(id).select("-password -verificationCode");
    if (!talent) return res.status(404).json({ message: "Talent not found" });

    res.json({ success: true, talent });
  } catch (error) {
    next(error);
  }
};
