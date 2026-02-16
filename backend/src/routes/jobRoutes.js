import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createJob, updateJob, jobUpload, getEmployerJobs, getSingleJob, deleteJob } from "../controllers/jobController.js";

const router = express.Router();

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

router.delete(
  "/delete/:id",
  protect,
  authorize("employer"),
  deleteJob
);

router.get(
  "/:id",
  protect,
  authorize("employer"),
  getSingleJob
);

export default router;
