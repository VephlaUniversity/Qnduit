import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  validateProfileTarget,
  getUserProfile,
  recordProfileView,
  getProfileViews,
  getProfileViewSummary,
} from "../controllers/profileController.js";

const router = express.Router();
router.use((req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
router.use(protect, authorize("talent", "employer"));
router.use((req, res, next) => {
  if (!req.user.isVerified)
    return res
      .status(403)
      .json({ message: "Verify your account before viewing profiles" });
  next();
});
router.get("/:userType/:userId/views/summary", validateProfileTarget, getProfileViewSummary);
router.get("/:userType/:userId", validateProfileTarget, getUserProfile);
router.post(
  "/:userType/:userId/views",
  validateProfileTarget,
  recordProfileView,
);
router.get("/:userType/:userId/views", validateProfileTarget, getProfileViews);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(500).json({ message: "Unable to process profile request" });
});
export default router;
