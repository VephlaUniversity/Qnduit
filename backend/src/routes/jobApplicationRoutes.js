import express from "express";
import {
  applyForJob,
  getMyApplications,
  getJobApplications,
} from "../controllers/jobApplicationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/apply", protect, applyForJob);

router.get("/my-applications", protect, getMyApplications);

router.get("/job/:jobId", protect, getJobApplications);

export default router;