import express from "express";
import { submitContactMessage } from "../controllers/contactController.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// 5 messages / 15 minutes per IP.
const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "You've sent several messages recently. Please try again in a little while.",
});

router.post("/", contactLimiter, submitContactMessage);

export default router;
