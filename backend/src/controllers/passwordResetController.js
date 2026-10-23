import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";

import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://qnduit.com";

const RESET_EXPIRY_MS = 15 * 60 * 1000;

const getAccountByEmail = async (email, userType) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (userType === "talent") return Talent.findOne({ email: normalizedEmail });
  if (userType === "employer") return Employer.findOne({ email: normalizedEmail });

  const talent = await Talent.findOne({
    email: normalizedEmail,
  });

  if (talent) return talent;

  return Employer.findOne({
    email: normalizedEmail,
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { userType } = req.body;
    if (Object.hasOwn(req.body, "userType") && !["talent", "employer"].includes(userType)) {
      return res.status(400).json({ success: false, message: "User type must be talent or employer." });
    }
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const genericResponse = {
      success: true,
      message:
        "If an account exists with that email, password reset instructions will be sent.",
    };

    const user = await getAccountByEmail(email, userType);

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + RESET_EXPIRY_MS
    );

    await user.save();

    const resetLink =
      `${FRONTEND_URL}/forgot-password?token=${rawToken}`;

    try {
      await sgMail.send({
        to: user.email,
        from: FROM_EMAIL,
        subject: "Reset your QNDUIT password",
        text: [
          "We received a request to reset your QNDUIT password.",
          "",
          `Open this link to choose a new password: ${resetLink}`,
          "",
          "This link expires in 15 minutes and can only be used once.",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: `
          <p>We received a request to reset your QNDUIT password.</p>
          <p>
            <a href="${resetLink}">Reset your password</a>
          </p>
          <p>This link expires in 15 minutes and can only be used once.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch {
      try {
        await user.constructor.updateOne(
          {
            _id: user._id,
            resetPasswordToken: hashedToken,
          },
          {
            $unset: {
              resetPasswordToken: "",
              resetPasswordExpires: "",
            },
          }
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up reset token after email failure:",
          cleanupError
        );
      }

      return res.status(502).json({ success: false, code: "RESET_EMAIL_FAILED", message: "Unable to send reset instructions. Please try again." });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (
      typeof token !== "string" ||
      !token ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (
      newPassword.length < 8 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const filter = {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    };

    const update = {
      $set: {
        password: hashedPassword,
      },
      $unset: {
        resetPasswordToken: "",
        resetPasswordExpires: "",
      },
    };

    const talentResult = await Talent.updateOne(filter, update);

    if (talentResult.matchedCount === 0) {
      const employerResult = await Employer.updateOne(
        filter,
        update
      );

      if (employerResult.matchedCount === 0) {
        return res.status(400).json({
          success: false,
          message:
            "This reset link is invalid or has expired. Please request a new one.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    next(error);
  }
};
