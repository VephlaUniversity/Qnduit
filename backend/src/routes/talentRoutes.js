import express from "express";
import {
  registerTalent,
  verifyTalentEmail,
  updateTalentProfile,
  selectTalentPlan,
  getTalentDashboard,
  upload,
} from "../controllers/talentController.js";

const router = express.Router();

// 1. Register new talent
router.post("/register", registerTalent);

// 2. Verify email with code
router.post("/verify", verifyTalentEmail);

// 3. Update talent profile (with optional resume upload)
router.put("/:id/profile", upload.single("resume"), updateTalentProfile);

// 4. Select subscription plan
router.put("/:id/plan", selectTalentPlan);

// 5. Get dashboard data
router.get("/:id/dashboard", getTalentDashboard);

export default router;
