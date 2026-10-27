import express from "express";
import upload from "../utils/upload.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createAdminJob, listAdminJobs, getAdminPostedJob, updateAdminJob, setAdminJobStatus, setAdminJobFlag, deleteAdminPostedJob, validateAdminJobTarget } from "../controllers/adminJobController.js";

const router = express.Router();
router.use((req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
router.use(protect, authorize("admin"));
const parseMedia = upload.fields([{ name: "featuredImage", maxCount: 1 }, { name: "photos", maxCount: 10 }]);
const mediaUpload = (req, res, next) => parseMedia(req, res, error => error
  ? res.status(400).json({ success: false, message: "Choose supported job media: PNG, JPG, JPEG or MP4; up to 10 new gallery files." })
  : next());
router.post("/", mediaUpload, createAdminJob);
router.get("/", listAdminJobs);
router.use("/:source/:id", validateAdminJobTarget);
router.get("/:source/:id", getAdminPostedJob);
router.patch("/:source/:id", mediaUpload, updateAdminJob);
router.patch("/:source/:id/status", setAdminJobStatus);
router.patch("/:source/:id/flag", setAdminJobFlag);
router.delete("/:source/:id", deleteAdminPostedJob);
export default router;
