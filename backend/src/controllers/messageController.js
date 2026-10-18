import { unreadSince } from "./messageReadController.js";
import mongoose from "mongoose";
import { pageLimit, encodeCursor, decodeCursor } from "../utils/messageCursor.js";
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

    const { recipientId, recipientModel, text, clientMessageId } = req.body || {};
    if (!validId(recipientId) || !["Talent", "Employer"].includes(recipientModel)) {
      return res.status(400).json({ message: "A valid recipient ID and user type are required." });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 10000) {
      return res.status(400).json({ message: "Message must contain text and be no longer than 10,000 characters." });
    }
    if (recipientId.toLowerCase() === String(senderId).toLowerCase()) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }
    if (clientMessageId !== undefined && (typeof clientMessageId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(clientMessageId))) {
      return res.status(400).json({ message: "Invalid message request key." });
    }
    const identity = { sender: senderId, senderModel: senderData.role, clientMessageId };
    const replay = message => {
      if (String(message.recipient).toLowerCase() !== recipientId.toLowerCase() || message.recipientModel !== recipientModel || message.text !== text) {
        return res.status(409).json({ success: false, message: "This message request key was already used for different content." });
      }
      return res.status(200).json({ success: true, message });
    };
    if (clientMessageId !== undefined) {
      const existing = await Message.findOne(identity);
      if (existing) return replay(existing);
    }
    const recipientType = recipientModel === "Talent" ? Talent : Employer;
    if (!await recipientType.exists({ _id: recipientId })) {
      return res.status(404).json({ message: "Recipient not found for the selected user type." });
    }

    let message;
    try {
      message = await Message.create({
      sender: senderId,
      senderModel: senderData.role,
      recipient: recipientId,
      recipientModel,
      text,
      ...(clientMessageId !== undefined ? { clientMessageId } : {}),
      });
    } catch (error) {
      if (clientMessageId !== undefined && error.code === 11000) {
        const existing = await Message.findOne(identity);
        if (existing) return replay(existing);
      }
      throw error;
    }

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

    const { withUserId, partnerModel, limit, before } = req.query;
    const bounded = limit !== undefined || before !== undefined;
    if (partnerModel !== undefined && (!validId(withUserId) || !["Talent", "Employer"].includes(partnerModel))
      || bounded && (!validId(withUserId) || !["Talent", "Employer"].includes(partnerModel))) {
      return res.status(400).json({ message: "A valid partner ID and user type are required." });
    }
    const scope = `${senderData.role}:${userId}:${partnerModel}:${withUserId?.toLowerCase()}`;
    let size, cursor;
    try {
      if (bounded) size = limit === undefined ? 50 : pageLimit(limit);
      if (before !== undefined) cursor = decodeCursor(before, scope);
    } catch {
      return res.status(400).json({ message: "Invalid message pagination." });
    }
    if (withUserId !== undefined && !validId(withUserId)) {
      return res.status(400).json({ message: "A valid partner ID is required." });
    }

    if (partnerModel !== undefined) {
      const Partner = partnerModel === "Talent" ? Talent : Employer;
      if (!await Partner.exists({ _id: withUserId })) return res.status(404).json({ message: "Recipient unavailable." });
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
          { sender: userId, senderModel: senderData.role, recipient: withUserId, recipientModel: partnerModel || { $in: ["Talent", "Employer"] } },
          { sender: withUserId, senderModel: partnerModel || { $in: ["Talent", "Employer"] }, recipient: userId, recipientModel: senderData.role },
        ],
      };
    }

    if (cursor) {
      const id = new mongoose.Types.ObjectId(cursor.id);
      const boundary = cursor.date === null ? { createdAt: null, _id: { $lt: id } } : {
        $or: [{ createdAt: { $lt: cursor.date } }, { createdAt: null }, { createdAt: cursor.date, _id: { $lt: id } }],
      };
      filter = { $and: [filter, boundary] };
    }
    const query = Message.find(filter).select("_id text createdAt sender senderModel read").sort({ createdAt: bounded ? -1 : 1, _id: bounded ? -1 : 1 });
    if (bounded) query.limit(size + 1);
    let messages = await query.lean();
    const hasMore = bounded && messages.length > size;
    if (hasMore) messages = messages.slice(0, size);
    const oldest = bounded ? messages.at(-1) : null;
    const nextCursor = hasMore ? encodeCursor(scope, oldest.createdAt, String(oldest._id)) : null;
    if (bounded) messages.reverse();

    let since = null;
    try { since = unreadSince(); } catch { /* An unread rollout error must not block existing transcript reads. */ }
    const formattedMessages = messages.map((m) => {
      const timestamp = m.createdAt instanceof Date && Number.isFinite(m.createdAt.getTime()) ? m.createdAt : null;
      return {
        id: m._id,
        read: m.read === true,
        readEligible: Boolean(since && m.createdAt >= since && m.senderModel !== undefined && !(m.sender?.toString() === userId.toString() && m.senderModel === senderData.role)),
        text: m.text,
        createdAt: timestamp,
        // Legacy fields remain compatible; viewers should format the absolute timestamp.
        time: timestamp ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        sender: m.sender?.toString() === userId.toString() && m.senderModel === senderData.role ? "me" : "them",
        date: timestamp ? timestamp.toDateString() : "",
      };
    });

    res.json({ success: true, messages: formattedMessages, ...(bounded ? { pagination: { limit: size, hasMore, nextCursor } } : {}) });
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

    const { limit, before } = req.query;
    const bounded = limit !== undefined || before !== undefined;
    const scope = `chats:${senderData.role}:${userId}`;
    let size, cursor;
    try {
      if (bounded) size = limit === undefined ? 30 : pageLimit(limit);
      if (before !== undefined) cursor = decodeCursor(before, scope, true);
    } catch {
      return res.status(400).json({ message: "Invalid chat pagination." });
    }
    const owner = new mongoose.Types.ObjectId(String(userId));
    const pipeline = [
      { $match: { $or: [{ sender: owner, senderModel: senderData.role }, { recipient: owner, recipientModel: senderData.role }] } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $project: { text: 1, createdAt: 1, partnerId: { $cond: [{ $and: [{ $eq: ["$sender", owner] }, { $eq: ["$senderModel", senderData.role] }] }, "$recipient", "$sender"] },
        partnerModel: { $cond: [{ $and: [{ $eq: ["$sender", owner] }, { $eq: ["$senderModel", senderData.role] }] }, "$recipientModel", "$senderModel"] } } },
      { $match: { partnerModel: { $in: ["Talent", "Employer"] } } },
      { $group: { _id: { id: "$partnerId", model: "$partnerModel" }, text: { $first: "$text" }, createdAt: { $first: "$createdAt" } } },
      { $set: { key: { $concat: ["$_id.model", ":", { $toString: "$_id.id" }] }, createdAt: { $ifNull: ["$createdAt", null] } } },
      // Exclude deleted accounts before pagination, so a page cannot disappear after hydration.
      { $lookup: { from: Talent.collection.name, localField: "_id.id", foreignField: "_id", pipeline: [{ $project: { _id: 1 } }], as: "talent" } },
      { $lookup: { from: Employer.collection.name, localField: "_id.id", foreignField: "_id", pipeline: [{ $project: { _id: 1 } }], as: "employer" } },
      { $match: { $or: [{ "_id.model": "Talent", "talent.0": { $exists: true } }, { "_id.model": "Employer", "employer.0": { $exists: true } }] } },
    ];
    if (cursor) pipeline.push({ $match: cursor.date === null ? { createdAt: null, key: { $gt: cursor.id } } : {
      $or: [{ createdAt: { $lt: cursor.date } }, { createdAt: null }, { createdAt: cursor.date, key: { $gt: cursor.id } }],
    } });
    pipeline.push({ $sort: { createdAt: -1, key: 1 } });
    if (bounded) pipeline.push({ $limit: size + 1 });
    let latest = await Message.aggregate(pipeline);
    const hasMore = bounded && latest.length > size;
    if (hasMore) latest = latest.slice(0, size);
    const last = latest.at(-1);
    const nextCursor = hasMore ? encodeCursor(scope, last.createdAt, last.key) : null;
    const latestByPartner = new Map(latest.map(item => [item.key, item]));
    const talentIds = latest.filter(item => item._id.model === "Talent").map(item => item._id.id);
    const employerIds = latest.filter(item => item._id.model === "Employer").map(item => item._id.id);

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
    res.json({ success: true, results, ...(bounded ? { pagination: { limit: size, hasMore, nextCursor } } : {}) });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load chats. Please try again." });
  }
};