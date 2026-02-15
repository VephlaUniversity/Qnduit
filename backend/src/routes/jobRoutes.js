import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createJob, updateJob, jobUpload } from "../controllers/jobController.js";

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

export default router;
