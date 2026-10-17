import express from "express";
import {
  applyForJob,
  getMyApplications,
  getJobApplications,
  getEmployerApplications
} from "../controllers/jobApplicationController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/apply", protect, applyForJob);

router.get("/my-applications", protect, getMyApplications);

router.get("/job/:jobId", protect, authorize("employer"), getJobApplications);

router.get("/employer", protect, getEmployerApplications);

export default router;