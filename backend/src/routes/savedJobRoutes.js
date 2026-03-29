import express from "express";
import { addSavedJob, removeSavedJob, getSavedJobs } from "../controllers/savedJobController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, addSavedJob);
router.post("/remove-job", protect, removeSavedJob);
router.get("/", protect, getSavedJobs);

export default router;