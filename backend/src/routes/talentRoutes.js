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
} from "../controllers/talentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerTalent);

router.post("/verify", verifyTalentEmail);

router.put("/:id/profile", upload.single("resume"), updateTalentProfile);

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

export default router;
