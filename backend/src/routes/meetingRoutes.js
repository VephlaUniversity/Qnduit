import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createMeeting,
  updateMeeting,
  getEmployerMeetings,
  getSingleMeeting,
  deleteMeeting,
} from "../controllers/meetingController.js";

const router = express.Router();

router.post(
  "/create", 
  protect, 
  authorize("employer"), 
  createMeeting

);

router.put(
  "/update/:id", 
  protect, 
  authorize("employer"), 
  updateMeeting

);

router.get(
  "/my-meetings", 
  protect, authorize("employer"), 
  getEmployerMeetings

);

router.get(
  "/:id", 
  protect, 
  authorize("employer"), 
  getSingleMeeting
);

router.delete(
  "/delete/:id", 
  protect, 
  authorize("employer"), 
  deleteMeeting
);

export default router;
