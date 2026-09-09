import express from "express";
import {
  registerTalent,
  verifyTalentEmail,
  updateTalentProfile,
  selectTalentPlan,
  getTalentDashboard,
  getTalentProfile,
  upload,
  talentUpload,
  searchTalentByEmail,
  uploadResume
} from "../controllers/talentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerTalent);

router.post("/verify", verifyTalentEmail);

router.post(
  "/resume",
  protect,
  upload.single("resume"),
  uploadResume
);

router.put(
  "/:id/profile",
  updateTalentProfile
);

router.put("/:id/plan", selectTalentPlan);

router.put(
  "/update",
  protect,
  talentUpload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "introVideo", maxCount: 1 }
  ]),
  updateTalentProfile
);

router.get("/profile", protect, getTalentProfile);

router.get("/:id/dashboard", getTalentDashboard);

router.get(
  "/search-by-email",
  protect,
  authorize("employer"),
  searchTalentByEmail
);

export default router;
