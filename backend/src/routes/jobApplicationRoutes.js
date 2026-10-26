import { requireEmployerJobSource } from "../middleware/requireEmployerJobSource.js";
import express from "express";
import { requireJobSource } from "../middleware/requireJobSource.js";
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
router.use(requireJobSource);

router.patch("/:applicationId/archive", requireEmployerJobSource, protect, authorize("employer"), archiveApplication);

router.patch("/:applicationId/status", requireEmployerJobSource, protect, authorize("employer"), updateApplicationStatus);

router.post("/apply", protect, authorize("talent"), applyForJob);

router.get("/my-applications", protect, authorize("talent"), getMyApplications);

router.get("/job/:jobId", requireEmployerJobSource, protect, authorize("employer"), getJobApplications);

router.get("/employer", requireEmployerJobSource, protect, authorize("employer"), getEmployerApplications);

export default router;