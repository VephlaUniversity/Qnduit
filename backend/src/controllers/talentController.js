import Talent from "../models/Talent.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";
import cloudinary from "../utils/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";


/*const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/resumes/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});*/

const resumeStorage = multer.memoryStorage();

export const upload = multer({
  storage: resumeStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      return cb(new Error("Only .pdf, .doc, and .docx files are allowed"));
    }

    cb(null, true);
  },
});

const talentStorage = multer.memoryStorage();

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
    // console.log(`📩 Verification code for ${email}: ${verificationCode}`);

    await sendVerificationEmail(
      email,
      firstName,
      verificationCode
    );

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

    const parseArrayField = (field) => {
      if (Array.isArray(field)) {
        return field.flatMap((item) => parseArrayField(item));
      }

      if (typeof field === "string") {
        const value = field.trim();

        if (!value) return [];

        try {
          const parsed = JSON.parse(value);

          if (Array.isArray(parsed)) {
            return parsed.flatMap((item) => parseArrayField(item));
          }

          if (typeof parsed === "string") {
            return parseArrayField(parsed);
          }
        } catch {}

        if (value.includes(",")) {
          return value
            .split(",")
            .flatMap((item) => parseArrayField(item))
            .filter(Boolean);
        }

        return [value];
      }

      return [];
    };

    ["categories", "tags", "skills"].forEach((key) => {
      if (updates[key] !== undefined) {
        updates[key] = [
          ...new Set(
            parseArrayField(updates[key])
              .map((item) => String(item).trim())
              .filter(Boolean)
          ),
        ];
      }
    });

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

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/talent-avatars",
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

        stream.end(avatarFile.buffer);
      });

      updates.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    if (req.files?.introVideo) {
      const videoFile = req.files.introVideo[0];

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/talent-videos",
            resource_type: "video",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.end(videoFile.buffer);
      });

      updates.introVideo = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
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

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume uploaded",
      });
    }

    const talent = await Talent.findById(req.user._id);

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found",
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "qnduit/talent-resumes",
          resource_type: "raw",
          public_id: `${talent._id}-${Date.now()}${extension}`,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    talent.resume = {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
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
    resume: talent.resume?.url || "",
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

export const searchTalentByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    const talent = await Talent.findOne({ email }).select(
      "_id firstName lastName email"
    );

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Talent not found",
      });
    }

    res.json({
      success: true,
      talent,
    });
  } catch (error) {
    next(error);
  }
};
