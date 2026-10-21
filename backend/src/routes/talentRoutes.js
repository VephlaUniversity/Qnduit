import express from "express";
import {
  registerTalent,
  verifyTalentEmail,
  updateTalentProfile,
  selectTalentPlan,
  getTalentDashboard,
  getTalentProfile,
  getPublicTalentProfile,
  listPublicTalents,
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
  protect,
  authorize("talent"),
  updateTalentProfile
);

router.put("/:id/plan", protect, authorize("talent"), selectTalentPlan);

router.put(
  "/update",
  protect,
  authorize("talent"),
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

router.get("/public", listPublicTalents);

router.get("/public/:username", getPublicTalentProfile);

export default router;
