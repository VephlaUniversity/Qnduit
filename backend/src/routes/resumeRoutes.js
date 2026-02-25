import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { saveResume, getResume, uploadResumeFiles } from "../controllers/resumeController.js";

const router = express.Router();

// Save resume (CVs and portfolio images)
router.put("/", protect, uploadResumeFiles, saveResume);

// Get resume
router.get("/", protect, getResume);

export default router;