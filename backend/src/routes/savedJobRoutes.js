import express from "express";
import { addSavedJob, removeSavedJob, getSavedJobs } from "../controllers/savedJobController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

import { requireJobSource } from "../middleware/requireJobSource.js";
const router = express.Router();
router.use(requireJobSource);

router.post("/", protect, addSavedJob);
router.post("/remove-job", protect, removeSavedJob);
router.get("/", protect, getSavedJobs);

export default router;