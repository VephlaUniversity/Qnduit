import Message from "../models/Message.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

// Helper to get user's role from DB
const getUserRole = async (userId) => {
  let user = await Talent.findById(userId).select("_id fullName email");
  if (user) return { role: "Talent", user };
  
  user = await Employer.findById(userId).select("_id companyName email");
  if (user) return { role: "Employer", user };
  
  return null;
};


// Send a message
export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const senderData = await getUserRole(senderId);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    const { recipientId, recipientModel, text } = req.body;
    if (!recipientId || !text || !recipientModel)
      return res.status(400).json({ message: "Recipient and text required" });

    const message = await Message.create({
      sender: senderId,
      senderModel: senderData.role,
      recipient: recipientId,
      recipientModel,
      text,
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// Get all messages for a user or with a specific user
export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const senderData = await getUserRole(userId);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    const { withUserId } = req.query;

    let filter = {
      $or: [
        { sender: userId, senderModel: senderData.role },
        { recipient: userId, recipientModel: senderData.role },
      ],
    };

    if (withUserId) {
      filter = {
        $or: [
          { sender: userId, senderModel: senderData.role, recipient: withUserId },
          { sender: withUserId, recipient: userId, recipientModel: senderData.role },
        ],
      };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .populate("sender", "firstName lastName email")
      .populate("recipient", "firstName lastName email");

    const formattedMessages = messages.map((m) => ({
      id: m._id,
      text: m.text,
      time: m.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: m.sender._id.toString() === userId.toString() ? "me" : "them",
      date: m.createdAt.toDateString(), 
    }));

    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    next(error);
  }
};

// Search users by email or name
export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query is required" });

    const talentResults = await Talent.find({
      $or: [
        { email: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } },
      ],
    }).select("_id fullName email avatar");

    const employerResults = await Employer.find({
      $or: [
        { email: { $regex: query, $options: "i" } },
        { companyName: { $regex: query, $options: "i" } },
      ],
    }).select("_id companyName email logo");

    // Add `role` for frontend
    const formattedTalentResults = talentResults.map((t) => ({
      ...t.toObject(),
      role: "Talent",
      name: t.fullName,
      avatar: t.avatar || t.fullName.charAt(0),
    }));

    const formattedEmployerResults = employerResults.map((e) => ({
      ...e.toObject(),
      role: "Employer",
      name: e.companyName,
      avatar: e.logo || e.companyName.charAt(0),
    }));

    res.json({
      success: true,
      results: [...formattedTalentResults, ...formattedEmployerResults],
    });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const senderData = await getUserRole(userId);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    // Find messages where the user is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId, senderModel: senderData.role },
        { recipient: userId, recipientModel: senderData.role },
      ],
    });

    const userIds = new Set();
    messages.forEach((m) => {
      if (m.sender.toString() !== userId.toString()) userIds.add(m.sender.toString());
      if (m.recipient.toString() !== userId.toString()) userIds.add(m.recipient.toString());
    });

    const talents = await Talent.find({ _id: { $in: [...userIds] } }).select("_id fullName email avatar");
    const employers = await Employer.find({ _id: { $in: [...userIds] } }).select("_id companyName email logo");

    const formattedTalents = talents.map((t) => ({
      ...t.toObject(),
      role: "Talent",
      name: t.fullName,
      avatar: t.avatar || t.fullName.charAt(0),
    }));
    const formattedEmployers = employers.map((e) => ({
      ...e.toObject(),
      role: "Employer",
      name: e.companyName,
      avatar: e.logo || e.companyName.charAt(0),
    }));

    res.json({ success: true, results: [...formattedTalents, ...formattedEmployers] });
  } catch (error) {
    next(error);
  }
};