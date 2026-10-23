import { withVerificationBadge } from "../services/verificationBadge.js";
import bcrypt from "bcryptjs";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

const getUserModel = (role) => {
  return role === "talent" ? Talent : Employer;
};


export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const { oldPassword, newPassword, retypePassword } = req.body;

    if (!oldPassword || !newPassword || !retypePassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== retypePassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const User = getUserModel(userRole);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isOldPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your old password",
      });
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete your account",
      });
    }

    const User = getUserModel(userRole);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const searchUsers = async (req, res, next) => {
  try {
    const query = String(req.query.query || "").trim();

    // Dashboard talent results use the same searchable fields and visibility rule,
    // but paginate talents independently of mixed navbar suggestions.
    if (req.query.userType === "talent") {
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const limit = Math.min(24, Math.max(1, Math.floor(Number(req.query.limit) || 6)));
      const literalRegex = value => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const regex = literalRegex(query);
      const visibleTalents = { showProfile: "show", isVerified: true, accountStatus: { $ne: "suspended" } };
      const filter = { ...visibleTalents };
      if (query) filter.$or = ["firstName", "lastName", "fullName", "email", "jobTitle", "location"].map(key => ({ [key]: regex }));
      // The UI displays firstName + lastName when fullName has not been saved.
      if (query) filter.$or.push({ $expr: { $regexMatch: {
        input: { $concat: [{ $ifNull: ["$firstName", ""] }, " ", { $ifNull: ["$lastName", ""] }] },
        regex: regex.source, options: "i",
      } } });
      if (req.query.location) filter.location = literalRegex(req.query.location);
      const experienceValues = {
        "< 1 year": "Less than 1 Year", "1–3 years": "1-3 Years",
        "3–5 years": "3-5 Years", "5+ years": "5 Years+",
      };
      if (req.query.experience && req.query.experience !== "Any experience") {
        const stored = Object.hasOwn(experienceValues, req.query.experience) ? experienceValues[req.query.experience] : null;
        if (!stored) return res.status(400).json({ message: "Invalid experience filter." });
        filter.experienceTime = new RegExp(`^${literalRegex(stored).source}$`, "i");
      }
      const qualification = String(req.query.qualification || "").trim();
      if (qualification && qualification !== "Any qualification") {
        filter.qualification = new RegExp(`^\\s*${literalRegex(qualification).source}\\s*$`, "i");
      }
      const age = { $convert: { input: "$age", to: "double", onError: null, onNull: null } };
      const minAge = Number(req.query.minAge), maxAge = Number(req.query.maxAge);
      if (Number.isFinite(minAge) && Number.isFinite(maxAge)) filter.$expr = { $or: [
        { $eq: [age, null] }, { $and: [{ $gte: [age, minAge] }, { $lte: [age, maxAge] }] },
      ] };
      const sort = req.query.sort === "newest" ? { createdAt: -1, _id: -1 } : { _id: 1 };
      const [total, talents, savedLocations] = await Promise.all([
        Talent.countDocuments(filter),
        Talent.find(filter).select("_id firstName lastName fullName email avatar jobTitle location age categories isVerified verificationBadgeOverride createdAt experienceTime qualification offeredSalary salaryType")
          .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        Talent.distinct("location", visibleTalents),
      ]);
      const locations = [...new Map(savedLocations.filter(value => typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "location not specified")
        .map(value => [value.trim().toLowerCase(), value.trim()])).values()].sort();
      return res.json({ success: true, page, limit, total, locations, totalPages: Math.ceil(total / limit),
        results: talents.map(talent => ({ ...withVerificationBadge(talent), userType: "talent" })) });
    }

    if (!query) {
      return res.json({
        success: true,
        results: [],
      });
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [talents, employers] = await Promise.all([
      Talent.find({
        showProfile: "show",
        $or: [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { email: regex },
          { jobTitle: regex },
          { location: regex },
        ],
      })
        .select("_id firstName lastName fullName email avatar jobTitle location")
        .limit(10)
        .lean(),

      Employer.find({
        $or: [
          { email: regex },
          { companyName: regex },
          { displayName: regex },
        ],
      })
        .select("_id companyName displayName email logo")
        .limit(10)
        .lean(),
    ]);

    const formattedTalents = talents.map((talent) => {
      const name =
        talent.fullName ||
        [talent.firstName, talent.lastName].filter(Boolean).join(" ") ||
        talent.email;

      return {
        ...talent,
        id: String(talent._id),
        name,
        fullName: name,
        role: talent.jobTitle || "Talent",
        userType: "talent",
        avatar: talent.avatar?.url || null,
      };
    });

    const formattedEmployers = employers.map((employer) => {
      const name =
        employer.displayName ||
        employer.companyName ||
        employer.email;

      return {
        ...employer,
        id: String(employer._id),
        name,
        fullName: name,
        role: "Employer",
        userType: "employer",
        avatar: employer.logo?.url || null,
      };
    });

    return res.json({
      success: true,
      results: [...formattedTalents, ...formattedEmployers],
    });
  } catch (error) {
    next(error);
  }
};

// Public landing-page counts: verified, non-suspended accounts only.
export const getPublicStats = async (req, res, next) => {
  try {
    const filter = { isVerified: true, accountStatus: { $ne: "suspended" } };
    const [talents, employers] = await Promise.all([
      Talent.countDocuments(filter),
      Employer.countDocuments(filter),
    ]);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ success: true, talents, employers, total: talents + employers });
  } catch (error) {
    next(error);
  }
};
