import express from "express";
import { submitContactMessage } from "../controllers/contactController.js";

const router = express.Router();

// Resets on restart and is per-instance
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

const contactLimiter = (req, res, next) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
    req.ip ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      message:
        "You've sent several messages recently. Please try again in a little while.",
    });
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
    }
  }
  next();
};

router.post("/", contactLimiter, submitContactMessage);

export default router;
