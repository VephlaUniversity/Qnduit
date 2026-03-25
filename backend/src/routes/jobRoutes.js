import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createJob, updateJob, jobUpload, getEmployerJobs, getSingleJob, deleteJob, searchJobs, getPublicJobDetails, getRelatedJobs } from "../controllers/jobController.js";

const router = express.Router();

// AUTH ROUTES
router.post(
  "/create",
  protect,
  authorize("employer"),
  jobUpload,
  createJob
);

router.put(
  "/update/:id",
  protect,
  authorize("employer"),
  jobUpload,
  updateJob
);

router.get(
  "/my-jobs",
  protect,
  authorize("employer"),
  getEmployerJobs
);


router.get(
  "/search",
  searchJobs
); // no auth

router.get(
  "/:id",
  protect,
  authorize("employer"),
  getSingleJob
);

router.delete(
  "/delete/:id",
  protect,
  authorize("employer"),
  deleteJob
);

router.get("/public/:id", getPublicJobDetails); // no auth
router.get("/related/:id", getRelatedJobs); // no auth

export default router;
