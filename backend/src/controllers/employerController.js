import Employer from "../models/Employer.js";
import Talent from "../models/Talent.js";
import generateToken from "../utils/generateToken.js";
import multer from "multer";
import path from "path";
import { sendVerificationEmail } from "../utils/sendEmail.js";
import cloudinary from "../utils/cloudinary.js";

const employerStorage = multer.memoryStorage();

export const upload = multer({
  storage: employerStorage,
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

    // console.log(`📩 Employer verification code for ${email}: ${verificationCode}`);
    await sendVerificationEmail(
      email,
      firstName,
      verificationCode
    );

    res.status(201).json({
      success: true,
      message: "Employer registered successfully. Verification code sent.",
      employerId: employer._id, // frontend uses this
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


export const updateEmployerProfile = async (req, res, next) => {
  try {
    const id = req.user._id;

    let updates = { ...req.body };

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
      updates.socialNetworks = JSON.parse(updates.socialNetworks);
    }


    if (updates.lat && updates.lng) {
      updates.geoLocation = {
        type: "Point",
        coordinates: [parseFloat(updates.lng), parseFloat(updates.lat)],
      };
    }

    delete updates.lat;
    delete updates.lng;
    delete updates.savedCandidates;

    if (req.files?.logo) {
      const logoFile = req.files.logo[0];

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "qnduit/employer-logos",
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

        stream.end(logoFile.buffer);
      });

      updates.logo = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    if (req.files?.gallery) {
      updates.gallery = [];

      for (const file of req.files.gallery) {
        const isVideo = file.mimetype.startsWith("video/");

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: isVideo
                ? "qnduit/employer-videos"
                : "qnduit/employer-gallery",
              resource_type: isVideo ? "video" : "image",
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

        updates.gallery.push({
          url: uploadResult.secure_url,
          type: isVideo ? "video" : "image",
          public_id: uploadResult.public_id,
        });
      }
    }

    const existingEmployer = await Employer.findById(id);

    if (!existingEmployer) {
      return res.status(404).json({
        success:false,
        message:"Employer not found"
      });
    }


    if (
      (updates.companyName || existingEmployer.companyName) &&
      (updates.aboutCompany || existingEmployer.aboutCompany) &&
      (updates.address || existingEmployer.address) &&
      (updates.logo || existingEmployer.logo?.url)
    ) {
      updates.profileCompleted = true;
    }

    updates.profileUpdatedAt = new Date();

    const employer = await Employer.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
        context: "query",
        omitUndefined: true
      }
    ).select("-password -verificationCode");



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


export const getEmployerProfile = async (req, res, next) => {
  try {
    const id = req.user._id;

    const employer = await Employer.findById(id)
      .select("-password -verificationCode");

    if (!employer)
      return res.status(404).json({ message: "Employer not found" });

    const profile = {
      ...employer._doc,

      logo: employer.logo?.url || "",

      gallery:
        employer.gallery?.map(item => ({
          url: item.url,
          type: item.type
        })) || [],

      lat: employer.geoLocation?.coordinates?.[1] || "",
      lng: employer.geoLocation?.coordinates?.[0] || "",

      socialNetworks: employer.socialNetworks || {
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

export const addSavedCandidate = async (req, res, next) => {
  try {
    const employerId = req.user._id;
    const candidateId = req.params.id;

    const employer = await Employer.findById(employerId);

    if (!employer) return res.status(404).json({ message: "Employer not found" });

    if (employer.savedCandidates.includes(candidateId)) {
      return res.status(400).json({ message: "Candidate already saved" });
    }

    employer.savedCandidates.push(candidateId);
    await employer.save();

    res.status(200).json({ success: true, message: "Candidate saved successfully" });
  } catch (error) {
    next(error);
  }
};

export const getSavedCandidates = async (req, res, next) => {
  try {
    const employerId = req.user._id;

    const employer = await Employer.findById(employerId).populate({
      path: "savedCandidates",
      select: "firstName lastName location jobTitle avatar resume"
    });

    res.status(200).json({ savedCandidates: employer.savedCandidates });
  } catch (error) {
    next(error);
  }
};

export const removeSavedCandidate = async (req, res, next) => {
  try {
    const employerId = req.user._id;
    const candidateId = req.params.id;

    const employer = await Employer.findById(employerId);

    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }

    employer.savedCandidates = employer.savedCandidates.filter(
      (candidate) => candidate._id.toString() !== candidateId
    );

    await employer.save();

    res.status(200).json({ success: true, message: "Candidate removed successfully" });
  } catch (error) {
    next(error);
  }
};

