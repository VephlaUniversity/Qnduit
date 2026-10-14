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
