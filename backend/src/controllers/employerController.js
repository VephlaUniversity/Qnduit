import Employer from "../models/Employer.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/logos/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(ext)) {
      return cb(new Error("Only .png, .jpg, and .jpeg files are allowed"));
    }
    cb(null, true);
  },
});


export const registerEmployer = async (req, res, next) => {
  try {
    const { email, firstName, lastName, password, accountType } = req.body;

    const existingEmployer = await Employer.findOne({ email });
    if (existingEmployer)
      return res.status(400).json({ message: "Email already registered" });

    // Generate 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const employer = await Employer.create({
      email,
      firstName,
      lastName,
      password,
      accountType: accountType || null,
      verificationCode,
    });

    // ********Send this via email service (SendGrid, Nodemailer, etc.)********
    console.log(`📩 Employer verification code for ${email}: ${verificationCode}`);

    res.status(201).json({
      success: true,
      message: "Employer registered successfully. Verification code sent.",
      employerId: employer._id, // frontend will use this
    });
  } catch (error) {
    next(error);
  }
};


export const verifyEmployerEmail = async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;

    const employer = await Employer.findOne({ email });
    if (!employer)
      return res.status(404).json({ message: "Employer not found" });

    if (employer.verificationCode !== verificationCode)
      return res.status(400).json({ message: "Invalid verification code" });

    employer.isVerified = true;
    employer.verificationCode = null;
    await employer.save();

    res.json({
      success: true,
      message: "Email verified successfully.",
      token: generateToken(employer._id),
    });
  } catch (error) {
    next(error);
  }
};


export const updateEmployerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // 🔒 Prevent password overwrite
    if (updates.password) {
      delete updates.password;
    }

    if (req.file) {
      updates.companyLogo = `/uploads/logos/${req.file.filename}`;
    }

    const employer = await Employer.findByIdAndUpdate(id, updates, { new: true });
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    res.json({
      success: true,
      message: "Profile updated successfully",
      employer,
    });
  } catch (error) {
    next(error);
  }
};


export const selectEmployerPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedPlan } = req.body;

    const employer = await Employer.findById(id);
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    employer.selectedPlan = selectedPlan;
    await employer.save();

    res.json({
      success: true,
      message: `Plan '${selectedPlan}' selected successfully`,
      employer,
    });
  } catch (error) {
    next(error);
  }
};


export const getEmployerDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employer = await Employer.findById(id).select("-password -verificationCode");
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    res.json({ success: true, employer });
  } catch (error) {
    next(error);
  }
};
