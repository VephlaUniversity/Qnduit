import express from "express";
import {
  createTicket,
  replyToOwnTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  replyToTicket,
  deleteTicket,
} from "../controllers/supportController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Talent and employer routes
router.post(
  "/tickets",
  protect,
  authorize("talent", "employer"),
  createTicket
);

router.get(
  "/tickets/mine",
  protect,
  authorize("talent", "employer"),
  getMyTickets
);

router.post("/tickets/:ticketId/replies", protect, authorize("talent", "employer"), replyToOwnTicket);

// Admin routes
router.get(
  "/admin/tickets",
  protect,
  authorize("admin"),
  getAllTickets
);

router.patch(
  "/admin/tickets/:ticketId/status",
  protect,
  authorize("admin"),
  updateTicketStatus
);

router.post(
  "/admin/tickets/:ticketId/replies",
  protect,
  authorize("admin"),
  replyToTicket
);

router.delete(
  "/admin/tickets/:ticketId",
  protect,
  authorize("admin"),
  deleteTicket
);

export default router;