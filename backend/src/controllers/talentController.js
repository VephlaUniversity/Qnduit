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

const talentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/talent/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const talentUpload = multer({
  storage: talentStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (![".png", ".jpg", ".jpeg", ".mp4"].includes(ext)) {
      return cb(new Error("Only images and mp4 allowed"));
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
    const id = req.user._id;
    const updates = { ...req.body };

    delete updates.password;
    delete updates.email;
    delete updates.isVerified;
    delete updates.selectedPlan;

    /*const parseArrayField = (field) => {
      if (Array.isArray(field)) return field;
      if (typeof field === "string") {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return field
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return undefined;
    };

    ["categories", "tags", "skills"].forEach((key) => {
      if (updates[key] !== undefined) {
        const parsed = parseArrayField(updates[key]);
        if (parsed !== undefined) updates[key] = parsed;
      }
    });*/

    if (updates.socialNetworks) {
      try {
        updates.socialNetworks =
          typeof updates.socialNetworks === "string"
            ? JSON.parse(updates.socialNetworks)
            : updates.socialNetworks;
      } catch {
        updates.socialNetworks = {};
      }
    }

    if (
      updates.lat !== undefined &&
      updates.lng !== undefined &&
      !isNaN(parseFloat(updates.lat)) &&
      !isNaN(parseFloat(updates.lng))
    ) {
      updates.geoLocation = {
        type: "Point",
        coordinates: [
          parseFloat(updates.lng),
          parseFloat(updates.lat),
        ],
      };
    }

    delete updates.lat;
    delete updates.lng;

    if (req.files?.avatar) {
      const avatarFile = req.files.avatar[0];
      updates.avatar = {
        url: `/uploads/talent/${avatarFile.filename}`,
        public_id: avatarFile.filename,
      };
    }

    if (req.files?.introVideo) {
      const videoFile = req.files.introVideo[0];
      updates.introVideo = {
        url: `/uploads/talent/${videoFile.filename}`,
        public_id: videoFile.filename,
      };
    }

    const existingTalent = await Talent.findById(id);
    if (!existingTalent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found",
      });
    }

    if (
      (updates.fullName || existingTalent.fullName) &&
      (updates.jobTitle || existingTalent.jobTitle) &&
      (updates.aboutMe || existingTalent.aboutMe) &&
      (updates.avatar || existingTalent.avatar?.url)
    ) {
      updates.profileCompleted = true;
    }

    updates.profileUpdatedAt = new Date();

    const talent = await Talent.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: "query",
      omitUndefined: true,
    }).select("-password -verificationCode");

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

export const getTalentProfile = async (req, res, next) => {
  try {

    const id = req.user._id;

    const talent = await Talent.findById(id)
      .select("-password -verificationCode");

    if (!talent)
      return res.status(404).json({ message: "Talent not found" });

    const profile = {

      ...talent._doc,

      avatar: talent.avatar?.url || "",

      introVideo: talent.introVideo?.url || "",

      lat: talent.geoLocation?.coordinates?.[1] || "",
      lng: talent.geoLocation?.coordinates?.[0] || "",

      socialNetworks: talent.socialNetworks || {
        facebook: "",
        linkedin: "",
        twitter: "",
        pinterest: "",
        instagram: "",
        youtube: "",
      },
    };

    res.json({
      success: true,
      profile,
    });

  } catch (error) {
    next(error);
  }
};

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume uploaded",
      });
    }

    const talent = await Talent.findById(req.user._id);

    talent.resume = {
      url: `/uploads/resumes/${req.file.filename}`,
      public_id: req.file.filename,
    };

    await talent.save();

    res.json({
      success: true,
      message: "Resume uploaded successfully",
      resume: talent.resume,
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
