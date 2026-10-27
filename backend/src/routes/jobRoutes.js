import { requireEmployerJobSource } from "../middleware/requireEmployerJobSource.js";
import express from "express";
import { requireJobSource } from "../middleware/requireJobSource.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createJob,
  updateJob,
  jobUpload,
  getEmployerJobs,
  getSingleJob,
  deleteJob,
  searchJobs,
  suggestJobs,
  quickSearchJobs,
  getPublicJobDetails,
  getRelatedJobs,
  contactJobPoster,
} from "../controllers/jobController.js";

const router = express.Router();
router.use(requireJobSource);

// job poster messages: 5 per 15 minutes per IP.
const jobContactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "You've sent several messages recently. Please try again in a little while.",
});

// AUTH ROUTES
router.post("/create", requireEmployerJobSource, protect, authorize("employer"), jobUpload, requireEmployerJobSource, createJob);

router.put("/update/:id", requireEmployerJobSource, protect, authorize("employer"), jobUpload, requireEmployerJobSource, updateJob);

router.get("/my-jobs", requireEmployerJobSource, protect, authorize("employer"), getEmployerJobs);

router.get("/", quickSearchJobs); // no auth: search-bar suggestions

router.get("/search", searchJobs); // no auth

router.get("/suggest", suggestJobs); // no auth: suggestions while typing

router.get("/:id", requireEmployerJobSource, protect, authorize("employer"), getSingleJob);

router.delete("/delete/:id", requireEmployerJobSource, protect, authorize("employer"), deleteJob);

router.get("/public/:id", getPublicJobDetails); // no auth
router.get("/related/:id", getRelatedJobs); // no auth
router.post("/:id/contact", requireEmployerJobSource, protect, jobContactLimiter, contactJobPoster); // signed-in users only

export default router;
