import mongoose from "mongoose";
import SupportTicket from "../models/SupportTicket.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit, 10) || 10)
  );

  return { page, limit, skip: (page - 1) * limit };
};

const getAccountName = (user) =>
  user.fullName ||
  user.name ||
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.companyName ||
  user.company ||
  user.email ||
  "User";

const formatTicket = (ticket) => {
  const item = ticket.toObject ? ticket.toObject() : ticket;

  return {
    ...item,
    id: String(item._id),
    subject: item.category,
    fullSubject: `${item.category} - ${item.title}`,
    date: new Date(item.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
};

// POST /api/support/tickets
export const createTicket = async (req, res) => {
  try {
    const { category, title, message } = req.body;
    const email = req.user.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Your account email could not be determined.",
      });
    }

    if (!category?.trim() || !title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category, subject, and message are required.",
      });
    }

    if (title.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: "Subject cannot exceed 80 characters.",
      });
    }

    if (message.trim().length < 10 || message.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Message must be between 10 and 10,000 characters.",
      });
    }

    const userType = req.user.role || req.user.userType;

    if (!["talent", "employer"].includes(userType)) {
      return res.status(403).json({
        success: false,
        message: "Only talent and employer accounts can submit tickets.",
      });
    }

    const ticket = await SupportTicket.create({
      name: getAccountName(req.user),
      email,
      userType,
      category: category.trim(),
      title: title.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully.",
      data: formatTicket(ticket),
    });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit support ticket.",
    });
  }
};

// GET /api/support/tickets/mine
export const getMyTickets = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const email = req.user.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Your account email could not be determined.",
      });
    }

    const filter = { email };

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: tickets.map(formatTicket),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my support tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load your support tickets.",
    });
  }
};

// GET /api/support/admin/tickets
export const getAllTickets = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const userType = String(req.query.userType || "").trim();

    const filter = {};

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { category: regex },
        { title: regex },
        { message: regex },
      ];
    }

    if (status && status !== "All Requests") {
      if (!["Open", "In Progress", "Resolved", "Closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket status filter.",
        });
      }

      filter.status = status;
    }

    if (userType) {
      if (!["talent", "employer"].includes(userType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type filter.",
        });
      }

      filter.userType = userType;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: tickets.map(formatTicket),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all support tickets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load support tickets.",
    });
  }
};

// PATCH /api/support/admin/tickets/:ticketId/status
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    if (!["Open", "In Progress", "Resolved", "Closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status.",
      });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    return res.json({
      success: true,
      message: `Ticket marked as ${status}.`,
      data: formatTicket(ticket),
    });
  } catch (error) {
    console.error("Update support ticket status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket status.",
    });
  }
};

// POST /api/support/admin/tickets/:ticketId/replies
export const replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const message = String(req.body.message || "").trim();

    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    if (!message || message.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "A reply of 1 to 10,000 characters is required.",
      });
    }

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    ticket.replies.push({
      message,
      adminId: req.user._id,
      adminName: getAccountName(req.user),
    });

    // Match the existing UI's behavior after sending a response.
    ticket.status = "Resolved";
    await ticket.save();

    return res.json({
      success: true,
      message: "Response saved successfully.",
      data: formatTicket(ticket),
    });
  } catch (error) {
    console.error("Reply to support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send support response.",
    });
  }
};

// DELETE /api/support/admin/tickets/:ticketId
export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    const ticket = await SupportTicket.findByIdAndDelete(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    return res.json({
      success: true,
      message: "Support ticket deleted successfully.",
    });
  } catch (error) {
    console.error("Delete support ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete support ticket.",
    });
  }
};