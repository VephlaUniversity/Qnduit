import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessages,
  searchUsers,
  getChats
} from "../controllers/messageController.js";

const router = express.Router();
router.use(protect, authorize("talent", "employer"));

// Send message
router.post("/send", sendMessage);

// Get messages or with a specific user
router.get("/", getMessages);

// Search users
router.get("/search", searchUsers);

// Chat route
router.get("/chats", getChats)

export default router;