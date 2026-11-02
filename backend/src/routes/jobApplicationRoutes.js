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
import { recordExternalApplicationActivity } from "../controllers/externalApplicationActivityController.js";
import { getApplicationActivityFeed } from "../controllers/applicationActivityFeedController.js";

const router = express.Router();
// Feed source=all is a filter, separate from the legacy job locator middleware.
router.get("/activity-feed", protect, authorize("talent"), getApplicationActivityFeed);
router.use(requireJobSource);

router.patch("/:applicationId/archive", requireEmployerJobSource, protect, authorize("employer"), archiveApplication);

router.patch("/:applicationId/status", requireEmployerJobSource, protect, authorize("employer"), updateApplicationStatus);

router.post("/apply", protect, authorize("talent"), applyForJob);
router.post("/external-activities", protect, authorize("talent"), recordExternalApplicationActivity);

router.get("/my-applications", protect, authorize("talent"), getMyApplications);

router.get("/job/:jobId", requireEmployerJobSource, protect, authorize("employer"), getJobApplications);

router.get("/employer", requireEmployerJobSource, protect, authorize("employer"), getEmployerApplications);

export default router;
