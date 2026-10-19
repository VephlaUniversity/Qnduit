import { Buffer } from "node:buffer";
import Notification from "../models/Notification.js";
import { deliveryEnabled } from "../services/notifications.js";
const owner = req => ({ recipientId: req.user._id, recipientType: req.user.role });
const scope = req => `${req.user.role}:${req.user._id}`;
const idPattern = /^[a-f\d]{24}$/i;
const unread = req => Notification.countDocuments({ ...owner(req), readAt: null });
export const requireNotifications = (req, res, next) => deliveryEnabled() ? next()
  : res.json({ enabled: false, items: [], unreadTotal: null, pagination: { hasMore: false, nextCursor: null } });
const display = row => ({ id: String(row._id), kind: row.kind, read: Boolean(row.readAt),
  createdAt: row.createdAt, occurredAt: row.occurredAt,
  text: row.kind === "application" ? "You received a new application." : `Your application status changed to ${row.status}.`,
  destination: row.kind === "application" ? "/dashboard/applicants" : "/talent-dashboard/my-applied" });
export const getNotifications = async (req, res) => {
  try {
    const { limit = "20", before } = req.query;
    if (typeof limit !== "string" || !/^[1-9]\d?$/.test(limit) || Number(limit) > 50) return res.status(400).json({ message: "Invalid notification pagination." });
    let cursor;
    if (before !== undefined) {
      try {
        if (typeof before !== "string" || before.length > 500 || !/^[\w-]+$/.test(before)) throw new Error();
        cursor = JSON.parse(Buffer.from(before, "base64url").toString());
        if (cursor.scope !== scope(req) || typeof cursor.id !== "string" || !idPattern.test(cursor.id)
          || typeof cursor.date !== "string" || !Number.isFinite(Date.parse(cursor.date))
          || new Date(cursor.date).toISOString() !== cursor.date) throw new Error();
      } catch { return res.status(400).json({ message: "Invalid notification cursor." }); }
    }
    const rows = await Notification.find({ ...owner(req), ...(cursor ? { $or: [
      { createdAt: { $lt: new Date(cursor.date) } }, { createdAt: new Date(cursor.date), _id: { $lt: cursor.id } },
    ] } : {}) }).sort({ createdAt: -1, _id: -1 }).limit(Number(limit) + 1).lean();
    const hasMore = rows.length > Number(limit);
    if (hasMore) rows.pop();
    const last = rows.at(-1);
    res.set("Cache-Control", "private, no-store").json({ enabled: true, items: rows.map(display), unreadTotal: await unread(req),
      pagination: { limit: Number(limit), hasMore, nextCursor: hasMore ? Buffer.from(JSON.stringify({ scope: scope(req), id: String(last._id), date: last.createdAt.toISOString() })).toString("base64url") : null } });
  } catch { res.status(503).json({ message: "Unable to load notifications. Please try again." }); }
};
export const markNotifications = async (req, res) => {
  try {
    const ids = req.params.id ? [req.params.id] : req.body?.ids;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some(id => typeof id !== "string" || !idPattern.test(id))) {
      return res.status(400).json({ message: "Provide between 1 and 50 valid notification IDs." });
    }
    const unique = [...new Set(ids.map(id => id.toLowerCase()))];
    const filter = { ...owner(req), _id: { $in: unique } };
    // Reject mixed/foreign IDs before writing; no delete endpoint or cleanup races.
    if (await Notification.countDocuments(filter) !== unique.length) return res.status(404).json({ message: "Notification not found." });
    await Notification.updateMany({ ...filter, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true, ids: unique, unreadTotal: await unread(req) });
  } catch { res.status(503).json({ message: "Unable to mark notifications read. Please try again." }); }
};
