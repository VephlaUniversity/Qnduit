import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessages,
  searchUsers,
  getChats
} from "../controllers/messageController.js";

const router = express.Router();

// Send message
router.post("/send", protect, sendMessage);

// Get messages or with a specific user
router.get("/", protect, getMessages);

// Search users
router.get("/search", protect, searchUsers);

// Chat route
router.get("/chats", protect, getChats)

export default router;