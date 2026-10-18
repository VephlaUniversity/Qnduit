import Message from "../models/Message.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";

const validId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// Resolve only the account type verified by authentication, not another collection's ID.
const getUserRole = async (userId, sessionRole) => {
  const model = sessionRole === "talent" ? Talent : sessionRole === "employer" ? Employer : null;
  if (!model) return null;
  const user = await model.findById(userId).select("_id firstName lastName email avatar companyName logo");
  return user ? { role: sessionRole === "talent" ? "Talent" : "Employer", user } : null;
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const senderData = await getUserRole(senderId, req.user.role);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    const { recipientId, recipientModel, text } = req.body || {};
    if (!validId(recipientId) || !["Talent", "Employer"].includes(recipientModel)) {
      return res.status(400).json({ message: "A valid recipient ID and user type are required." });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 10000) {
      return res.status(400).json({ message: "Message must contain text and be no longer than 10,000 characters." });
    }
    if (recipientId.toLowerCase() === String(senderId).toLowerCase()) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }
    const recipientType = recipientModel === "Talent" ? Talent : Employer;
    if (!await recipientType.exists({ _id: recipientId })) {
      return res.status(404).json({ message: "Recipient not found for the selected user type." });
    }

    const message = await Message.create({
      sender: senderId,
      senderModel: senderData.role,
      recipient: recipientId,
      recipientModel,
      text,
    });

    res.status(201).json({ success: true, message });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to send message. Please try again." });
  }
};

// Get all messages for a user or with a specific user
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const senderData = await getUserRole(userId, req.user.role);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    const { withUserId } = req.query;
    if (withUserId !== undefined && !validId(withUserId)) {
      return res.status(400).json({ message: "A valid partner ID is required." });
    }

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

    const formattedMessages = messages.map((m) => {
      const timestamp = m.createdAt instanceof Date && Number.isFinite(m.createdAt.getTime()) ? m.createdAt : null;
      return {
        id: m._id,
        text: m.text,
        createdAt: timestamp,
        // Legacy fields remain compatible; viewers should format the absolute timestamp.
        time: timestamp ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        sender: m.sender?._id?.toString() === userId.toString() ? "me" : "them",
        date: timestamp ? timestamp.toDateString() : "",
      };
    });

    res.json({ success: true, messages: formattedMessages });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load messages. Please try again." });
  }
};

// Search users by email or name
export const searchUsers = async (req, res) => {
  try {
    const { query, recipientId, recipientModel } = req.query;
    const resolving = recipientId !== undefined || recipientModel !== undefined;
    if (resolving) {
      if (!validId(recipientId) || !["Talent", "Employer"].includes(recipientModel)) {
        return res.status(400).json({ message: "A valid recipient ID and user type are required." });
      }
      if (recipientId.toLowerCase() === String(req.user._id).toLowerCase()) {
        return res.status(400).json({ message: "You cannot message yourself." });
      }
    } else if (typeof query !== "string" || !query.trim() || query.length > 200) {
      return res.status(400).json({ message: "Search must contain between 1 and 200 characters." });
    }
    const literalQuery = resolving ? "" : query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const talentResults = resolving && recipientModel !== "Talent" ? [] : await Talent.find(resolving ? { _id: recipientId } : {
      $or: [
        { email: { $regex: literalQuery, $options: "i" } },
        { firstName: { $regex: literalQuery, $options: "i" } },
        { lastName: { $regex: literalQuery, $options: "i" } },
      ],
    }).select("_id firstName lastName email avatar");
    const employerResults = resolving && recipientModel !== "Employer" ? [] : await Employer.find(resolving ? { _id: recipientId } : {
      $or: [
        { email: { $regex: literalQuery, $options: "i" } },
        { firstName: { $regex: literalQuery, $options: "i" } },
        { lastName: { $regex: literalQuery, $options: "i" } },
        { companyName: { $regex: literalQuery, $options: "i" } },
      ],
    }).select("_id firstName lastName email companyName logo");
    if (resolving && talentResults.length + employerResults.length === 0) {
      return res.status(404).json({ message: "Recipient unavailable." });
    }

    // Add `role` for frontend
    const formattedTalentResults = talentResults.map((t) => {
      const name = `${t.firstName || ""} ${t.lastName || ""}`.trim();

      return {
        ...t.toObject(),
        role: "Talent",
        name: name || t.email,
        avatar: t.avatar?.url || name.charAt(0) || "?",
      };
    });

    const formattedEmployerResults = employerResults.map((e) => {
      const personName = `${e.firstName || ""} ${e.lastName || ""}`.trim();

      const name = e.companyName || personName || e.email;

      return {
        ...e.toObject(),
        role: "Employer",
        name,
        avatar: e.logo?.url || name.charAt(0) || "?",
      };
    });

    res.json({
      success: true,
      results: [...formattedTalentResults, ...formattedEmployerResults],
    });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to search users. Please try again." });
  }
};

export const getChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const senderData = await getUserRole(userId, req.user.role);
    if (!senderData) return res.status(404).json({ message: "User not found" });

    // Find messages where the user is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId, senderModel: senderData.role },
        { recipient: userId, recipientModel: senderData.role },
      ],
    }).sort({ createdAt: -1, _id: -1 });

    const latestByPartner = new Map();
    const talentIds = new Set();
    const employerIds = new Set();
    messages.forEach((m) => {
      const outgoing = m.sender.toString() === userId.toString() && m.senderModel === senderData.role;
      const partnerId = outgoing ? m.recipient : m.sender;
      const partnerModel = outgoing ? m.recipientModel : m.senderModel;
      const key = `${partnerModel}:${partnerId}`;
      if (!latestByPartner.has(key)) latestByPartner.set(key, m);
      if (partnerModel === "Talent") talentIds.add(partnerId.toString());
      if (partnerModel === "Employer") employerIds.add(partnerId.toString());
    });

    const talents = await Talent.find({ _id: { $in: [...talentIds] } })
      .select("_id firstName lastName email avatar");
    const employers = await Employer.find({ _id: { $in: [...employerIds] } })
      .select("_id firstName lastName email companyName logo");

    const preview = (model, id) => {
      const latest = latestByPartner.get(`${model}:${id}`);
      return latest ? { lastMessage: latest.text, lastMessageAt: latest.createdAt } : {};
    };
    const formattedTalents = talents.map((t) => {
      const name = `${t.firstName || ""} ${t.lastName || ""}`.trim();

      return {
        ...t.toObject(),
        ...preview("Talent", t._id),
        role: "Talent",
        name: name || t.email,
        avatar: t.avatar?.url || name.charAt(0) || "?",
      };
    });

    const formattedEmployers = employers.map((e) => {
      const personName = `${e.firstName || ""} ${e.lastName || ""}`.trim();
      const name = e.companyName || personName || e.email;

      return {
        ...e.toObject(),
        ...preview("Employer", e._id),
        role: "Employer",
        name,
        avatar: e.logo?.url || name.charAt(0) || "?",
      };
    });

    const results = [...formattedTalents, ...formattedEmployers].sort((a, b) => {
      const timestamp = value => value instanceof Date && Number.isFinite(value.getTime()) ? value.getTime() : -Infinity;
      const difference = timestamp(b.lastMessageAt) - timestamp(a.lastMessageAt);
      if (difference && !Number.isNaN(difference)) return difference;
      const aKey = `${a.role}:${a._id}`, bKey = `${b.role}:${b._id}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
    res.json({ success: true, results });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load chats. Please try again." });
  }
};