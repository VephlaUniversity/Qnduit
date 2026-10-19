import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import MessagePresence from "../models/MessagePresence.js";

const models = { Talent, Employer };
const validId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
export const heartbeat = async (req, res) => {
  try {
    if (!req.user.isVerified) return res.status(403).json({ message: "Presence unavailable." });
    const body = req.body || {};
    if (typeof body !== "object" || Array.isArray(body) || Object.keys(body).length || Object.keys(req.query).length) {
      return res.status(400).json({ message: "Heartbeat does not accept an account identity or other fields." });
    }
    const model = req.user.role === "talent" ? "Talent" : "Employer";
    const id = `${model}:${req.user._id}`;
    try {
      await MessagePresence.updateOne({ _id: id }, {
        $setOnInsert: { owner: req.user._id, ownerModel: model }, $currentDate: { heartbeatAt: true },
      }, { upsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      await MessagePresence.updateOne({ _id: id }, { $currentDate: { heartbeatAt: true } });
    }
    return res.json({ success: true, heartbeatAfterMs: 20000, expiresAfterMs: 60000 });
  } catch { return res.status(503).json({ message: "Unable to update presence. Please try again." }); }
};

export const lookupPresence = async (req, res) => {
  try {
    const { recipients } = req.body || {};
    if (!Array.isArray(recipients) || !recipients.length || recipients.length > 100
      || Object.keys(req.body).some(key => key !== "recipients") || recipients.some(row => !row || typeof row !== "object" || Array.isArray(row)
        || !validId(row.id) || !Object.hasOwn(models, row.model) || Object.keys(row).some(key => !["id", "model"].includes(key)))
      || new Set(recipients.map(row => `${row.model}:${row.id.toLowerCase()}`)).size !== recipients.length) {
      return res.status(400).json({ message: "Provide 1–100 distinct recipients with valid IDs and account types." });
    }
    const eligible = new Set();
    for (const [model, Model] of Object.entries(models)) {
      const ids = recipients.filter(row => row.model === model).map(row => row.id);
      if (!ids.length) continue;
      const users = await Model.find({ _id: { $in: ids }, isVerified: true, accountStatus: { $ne: "suspended" } }).select("_id").lean();
      users.forEach(user => eligible.add(`${model}:${user._id}`));
    }
    const rows = await MessagePresence.aggregate([
      { $match: { _id: { $in: [...eligible] } } },
      { $project: { valid: { $and: [{ $eq: [{ $type: "$heartbeatAt" }, "date"] }, { $lte: ["$heartbeatAt", "$$NOW"] }] },
        remaining: { $cond: [{ $eq: [{ $type: "$heartbeatAt" }, "date"] }, { $subtract: [{ $add: ["$heartbeatAt", 60000] }, "$$NOW"] }, 0] } } },
    ]);
    const byId = new Map(rows.map(row => [row._id, row]));
    return res.json({ success: true, expiresAfterMs: 60000, results: recipients.map(({ id, model }) => {
      id = id.toLowerCase();
      const row = byId.get(`${model}:${id}`);
      const status = !eligible.has(`${model}:${id}`) || !row?.valid ? "unknown" : row.remaining > 0 ? "online" : "offline";
      return { id, model, status, validForMs: status === "unknown" ? 0 : status === "online" ? Math.min(10000, row.remaining) : 10000 };
    }) });
  } catch { return res.status(503).json({ message: "Unable to load presence. Please try again." }); }
};
