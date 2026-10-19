import express from "express";
import {
  applyForJob,
  getMyApplications,
  getJobApplications,
  getEmployerApplications,
  updateApplicationStatus,
  archiveApplication
} from "../controllers/jobApplicationController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.patch("/:applicationId/archive", protect, authorize("employer"), archiveApplication);

router.patch("/:applicationId/status", protect, authorize("employer"), updateApplicationStatus);

router.post("/apply", protect, authorize("talent"), applyForJob);

router.get("/my-applications", protect, getMyApplications);

router.get("/job/:jobId", protect, authorize("employer"), getJobApplications);

router.get("/employer", protect, authorize("employer"), getEmployerApplications);

export default router;