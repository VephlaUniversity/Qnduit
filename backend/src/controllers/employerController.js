import Employer from "../models/Employer.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".mp4"].includes(ext)) {
      return cb(new Error("Only images and mp4 allowed"));
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

    let updates = { ...req.body };

    delete updates.password;

    if (updates.categories && typeof updates.categories === "string") {
      updates.categories = updates.categories.split(",");
    }

    updates.socialNetworks = {
      facebook: updates.facebook || "",
      linkedin: updates.linkedin || "",
      twitter: updates.twitter || "",
      pinterest: updates.pinterest || "",
      instagram: updates.instagram || "",
      youtube: updates.youtube || "",
    };

    delete updates.facebook;
    delete updates.linkedin;
    delete updates.twitter;
    delete updates.pinterest;
    delete updates.instagram;
    delete updates.youtube;

    if (updates.lat && updates.lng) {
      updates.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(updates.lng), parseFloat(updates.lat)],
      };
    }

    delete updates.lat;
    delete updates.lng;

    if (req.files?.logo) {
      const logoFile = req.files.logo[0];
      updates.logo = {
        url: `/uploads/${logoFile.filename}`,
        public_id: logoFile.filename,
      };
    }

    if (req.files?.gallery) {
      updates.gallery = req.files.gallery.map((file) => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith("video") ? "video" : "image",
        public_id: file.filename,
      }));
    }

    const existingEmployer = await Employer.findById(id);

    if (
      (updates.companyName || existingEmployer.companyName) &&
      (updates.aboutCompany || existingEmployer.aboutCompany) &&
      (updates.address || existingEmployer.address) &&
      (updates.logo || existingEmployer.logo?.url)
    ) {
      updates.profileCompleted = true;
    }

    updates.profileUpdatedAt = new Date();

    const employer = await Employer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password -verificationCode");

    if (!employer)
      return res.status(404).json({ message: "Employer not found" });

    res.json({
      success: true,
      message: "Profile updated successfully",
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
