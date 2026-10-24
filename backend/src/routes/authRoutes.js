import { protect, authorize } from "../middleware/authMiddleware.js";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { loginUser } from "../controllers/authController.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again in 15 minutes.",
  },
});

router.get("/session", (req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); },
  protect, authorize("talent", "employer"), (req, res) => res.json({ success: true, session: {
    id: String(req.user._id), role: req.user.role, accountStatus: req.user.accountStatus,
  } }));

router.post("/login", authLimiter, loginUser);
router.post("/forgot-password", authLimiter, forgotPassword);

router.post("/reset-password/:token", authLimiter, resetPassword);

export default router;
