import express from "express";
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
  quickSearchJobs,
  getPublicJobDetails,
  getRelatedJobs,
  contactJobPoster,
} from "../controllers/jobController.js";

const router = express.Router();

// job poster messages: 5 per 15 minutes per IP.
const jobContactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "You've sent several messages recently. Please try again in a little while.",
});

// AUTH ROUTES
router.post("/create", protect, authorize("employer"), jobUpload, createJob);

router.put("/update/:id", protect, authorize("employer"), jobUpload, updateJob);

router.get("/my-jobs", protect, authorize("employer"), getEmployerJobs);

router.get("/", quickSearchJobs); // no auth: search-bar suggestions

router.get("/search", searchJobs); // no auth

router.get("/:id", protect, authorize("employer"), getSingleJob);

router.delete("/delete/:id", protect, authorize("employer"), deleteJob);

router.get("/public/:id", getPublicJobDetails); // no auth
router.get("/related/:id", getRelatedJobs); // no auth
router.post("/:id/contact", protect, jobContactLimiter, contactJobPoster); // signed-in users only

export default router;
