import { ingestMessageAttachments } from "../utils/messageAttachments/ingest.js";
import { downloadMessageAttachment } from "../controllers/messageAttachmentController.js";
import { unreadMessages, acknowledgeMessages } from "../controllers/messageReadController.js";
import { heartbeat, lookupPresence } from "../controllers/messagePresenceController.js";
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

router.post("/heartbeat", heartbeat);
router.post("/presence", lookupPresence);

router.get("/unread", unreadMessages);
router.patch("/read", acknowledgeMessages);

// Send message
router.post("/send", ingestMessageAttachments, sendMessage);
router.get("/:messageId/attachments/:attachmentId", downloadMessageAttachment);

// Get messages or with a specific user
router.get("/", getMessages);

// Search users
router.get("/search", searchUsers);

// Chat route
router.get("/chats", getChats)

export default router;
