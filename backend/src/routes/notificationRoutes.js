import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { requireNotifications, getNotifications, markNotifications } from "../controllers/notificationController.js";
const router = express.Router();
router.use(protect, authorize("talent", "employer"), requireNotifications);
router.get("/", getNotifications);
router.post("/read-displayed", markNotifications);
router.post("/:id/read", markNotifications);
export default router;
