import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { saveResume, getResume, uploadResumeFiles } from "../controllers/resumeController.js";
import { getTalentProjects } from "../controllers/talentPortfolioController.js";

import { savePortfolioPage, getPortfolioSaveStatus } from "../controllers/portfolioSaveController.js";

const router = express.Router();

router.get("/talent-projects", protect, authorize("talent"), getTalentProjects);
router.get("/save-receipts/:requestId", protect, authorize("talent"), getPortfolioSaveStatus);

// Save resume (CVs and portfolio images)
router.put("/", protect, authorize("talent"), uploadResumeFiles, (req, res, next) =>
  Object.hasOwn(req.body, "saveRequestId") || Object.hasOwn(req.body, "talentItems")
    ? savePortfolioPage(req, res) : saveResume(req, res, next));

// Get resume
router.get("/", protect, authorize("talent"), getResume);

export default router;
