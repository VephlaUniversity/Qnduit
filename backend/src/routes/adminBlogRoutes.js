import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { blogCoverUpload } from "../middleware/blogCoverUpload.js";
import { blogController } from "../controllers/blogController.js";

const router = express.Router();
router.use((req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
router.use(protect, authorize("admin"));
router.get("/", blogController.listAdmin);
router.post("/", blogCoverUpload, blogController.create);
router.get("/:id", blogController.adminDetail);
router.delete("/:id", blogController.remove);
router.patch("/:id", blogCoverUpload, blogController.update);
router.patch("/:id/publish", blogController.publish);
export default router;
