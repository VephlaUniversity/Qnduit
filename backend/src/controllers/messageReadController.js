import process from "node:process";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { pageLimit, encodeCursor, decodeCursor } from "../utils/messageCursor.js";

export function unreadSince() {
  const value = process.env.MESSAGE_UNREAD_SINCE;
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) throw new Error("Invalid unread rollout configuration");
  return date;
}
const actorModel = req => req.user.role === "talent" ? "Talent" : "Employer";
const validId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export const unreadMessages = async (req, res) => {
  try {
    const since = unreadSince();
    if (!since) return res.json({ success: true, enabled: false, since: null, total: null, results: [], pagination: { hasMore: false, nextCursor: null } });
    const scope = `unread:${actorModel(req)}:${req.user._id}:${since.toISOString()}`;
    let size, cursor;
    try {
      size = req.query.limit === undefined ? 100 : pageLimit(req.query.limit);
      if (req.query.before !== undefined) cursor = decodeCursor(req.query.before, scope, true);
    } catch { return res.status(400).json({ message: "Invalid unread pagination." }); }
    const rows = await Message.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(String(req.user._id)), recipientModel: actorModel(req), senderModel: { $in: ["Talent", "Employer"] }, read: false, createdAt: { $gte: since } } },
      { $group: { _id: { id: "$sender", role: "$senderModel" }, unread: { $sum: 1 } } },
      { $set: { key: { $concat: ["$_id.role", ":", { $toString: "$_id.id" }] } } },
      { $facet: { total: [{ $group: { _id: null, count: { $sum: "$unread" } } }], rows: [
        ...(cursor ? [{ $match: { key: { $gt: cursor.id } } }] : []), { $sort: { key: 1 } }, { $limit: size + 1 },
      ] } },
    ]);
    const result = rows[0], hasMore = result.rows.length > size, page = result.rows.slice(0, size);
    return res.json({ success: true, enabled: true, since: since.toISOString(), total: result.total[0]?.count || 0,
      results: page.map(row => ({ id: row._id.id, role: row._id.role, unread: row.unread })),
      pagination: { limit: size, hasMore, nextCursor: hasMore ? encodeCursor(scope, null, page.at(-1).key) : null } });
  } catch { return res.status(503).json({ message: "Unable to load unread counts. Please try again." }); }
};

export const acknowledgeMessages = async (req, res) => {
  try {
    const { messageIds, partnerId, partnerModel } = req.body || {};
    if (!Array.isArray(messageIds) || !messageIds.length || messageIds.length > 100 || !messageIds.every(validId)
      || new Set(messageIds.map(id => id.toLowerCase())).size !== messageIds.length || !validId(partnerId) || !["Talent", "Employer"].includes(partnerModel)) {
      return res.status(400).json({ message: "Provide 1–100 distinct message IDs and a valid partner." });
    }
    const since = unreadSince();
    if (!since) return res.status(503).json({ message: "Unread tracking is not enabled." });
    const filter = { _id: { $in: messageIds }, recipient: req.user._id, recipientModel: actorModel(req), sender: partnerId, senderModel: partnerModel, createdAt: { $gte: since } };
    if (await Message.countDocuments(filter) !== messageIds.length) return res.status(404).json({ message: "Messages unavailable for acknowledgement." });
    const result = await Message.updateMany({ ...filter, read: false }, { $set: { read: true } });
    return res.json({ success: true, acknowledgedIds: messageIds.map(id => id.toLowerCase()), modifiedCount: result.modifiedCount });
  } catch { return res.status(500).json({ message: "Unable to acknowledge messages. Please try again." }); }
};
