import Talent from "../models/Talent.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";
import cloudinary from "../utils/cloudinary.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";
import TalentSubscription from "../models/TalentSubscription.js";


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
    // Owner editors may resend account metadata; only profile fields are editable.
    const editableFields = [
      "firstName", "lastName", "fullName", "dateOfBirth", "phone", "gender", "age",
      "jobTitle", "qualification", "experienceTime", "language", "location", "address",
      "aboutMe", "showProfile", "offeredSalary", "salaryType", "categories", "tags",
      "skills", "socialNetworks", "avatar", "introVideo", "geoLocation", "lat", "lng",
    ];
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const updates = Object.fromEntries(editableFields
      .filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));

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
        } catch { /* Non-JSON array input is handled as plain text below. */ }

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

    // Suggestions are not an enum: keep custom and previously saved values valid.
    for (const field of ["categories", "tags"]) {
      if (updates[field] && (updates[field].length > 50 ||
        updates[field].some(value => value.length > 200))) {
        return res.status(400).json({
          success: false,
          message: `${field === "tags" ? "Skills" : "Categories"} must contain at most 50 values of 200 characters each.`,
        });
      }
    }

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


export const selectTalentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: "Invalid Talent ID." });
    }
    if (String(req.user._id).toLowerCase() !== id.toLowerCase()) {
      return res.status(403).json({ message: "You can only select your own plan." });
    }
    const { selectedPlan } = req.body || {};
    if (!["free", "public"].includes(selectedPlan)) {
      return res.status(400).json({ message: "Select a valid Talent plan." });
    }
    // Selection is intent only; payment activation remains in paymentController.
    const talent = await Talent.findByIdAndUpdate(id, { $set: { selectedPlan } }, {
      new: true, runValidators: true,
    }).select("_id selectedPlan");
    if (!talent) return res.status(404).json({ message: "Talent not found" });
    res.json({
      success: true,
      message: `Plan '${selectedPlan}' selected successfully`,
      talent: { _id: talent._id, selectedPlan: talent.selectedPlan },
    });
  } catch {
    res.status(500).json({ message: "Unable to select your plan. Please try again." });
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


const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Public directory of talents. Same eligibility rule as getPublicTalentProfile:
// verified, active, profile shown, public listing enabled and a live paid subscription.
export const listPublicTalents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const q = String(req.query.q || "").trim().slice(0, 60);
    const country = String(req.query.country || "").trim().slice(0, 60);

    const subscribedIds = await TalentSubscription.distinct("talent", {
      status: "active",
      currentPeriodEnd: { $gt: new Date() },
    });

    const filter = {
      _id: { $in: subscribedIds },
      isVerified: true,
      accountStatus: "active",
      showProfile: "show",
      selectedPlan: "public",
      paymentStatus: "active",
      publicProfileEnabled: true,
      username: { $exists: true, $ne: "" },
    };

    if (country) filter.location = new RegExp(`^${escapeRegex(country)}$`, "i");

    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { fullName: pattern },
        { firstName: pattern },
        { lastName: pattern },
        { jobTitle: pattern },
        { tags: pattern },
      ];
    }

    const [total, talents] = await Promise.all([
      Talent.countDocuments(filter),
      Talent.find(filter)
        .select("username fullName firstName lastName jobTitle location tags avatar experienceTime")
        .sort({ profileUpdatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      talents: talents.map((talent) => ({
        username: talent.username,
        name:
          talent.fullName ||
          `${talent.firstName || ""} ${talent.lastName || ""}`.trim() ||
          "Talent",
        jobTitle: talent.jobTitle || "",
        location: talent.location || "",
        experienceTime: talent.experienceTime || "",
        skills: (talent.tags || []).slice(0, 5),
        avatar: talent.avatar?.url || "",
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicTalentProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const talent = await Talent.findOne({
      username: username.toLowerCase(),
      isVerified: true,
      accountStatus: "active",
      showProfile: "show",
      selectedPlan: "public",
      paymentStatus: "active",
      publicProfileEnabled: true,
    }).select(
      [
        "username",
        "fullName",
        "firstName",
        "lastName",
        "jobTitle",
        "qualification",
        "experienceTime",
        "location",
        "aboutMe",
        "categories",
        "tags",
        "avatar",
        "introVideo",
        "socialNetworks",
        "portfolioUrl",
        "portfolio",
        "experience",
        "profileUpdatedAt",
      ].join(" ")
    );

    if (!talent) {
      return res.status(404).json({
        success: false,
        message: "Public profile not found.",
      });
    }

    const subscription = await TalentSubscription.findOne({
      talent: talent._id,
      status: "active",
      currentPeriodEnd: { $gt: new Date() },
    }).select("_id");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Public profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      talent: {
        ...talent.toObject(),
        avatar: talent.avatar?.url || "",
        introVideo: talent.introVideo?.url || "",
      },
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
