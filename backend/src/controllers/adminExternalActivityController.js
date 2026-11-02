import mongoose from "mongoose";
import Activity from "../models/ExternalApplicationActivity.js";

// Audit reads deliberately retain snapshots, unavailable actors/jobs and each click.
export async function listAdminExternalActivities(req, res) {
  const { q = "", jobId = "", page = "1", limit = "20" } = req.query;
  if (Object.keys(req.query).some(key => !["q", "jobId", "page", "limit"].includes(key)) ||
    typeof q !== "string" || q.length > 200 || typeof jobId !== "string" || (jobId && !/^[a-f\d]{24}$/i.test(jobId)) ||
    typeof page !== "string" || !/^[1-9]\d*$/.test(page) || Number(page) > 100000 ||
    typeof limit !== "string" || !/^[1-9]\d*$/.test(limit) || Number(limit) > 50) {
    return res.status(400).json({ success: false, message: "Invalid activity filters or pagination." });
  }
  try {
    const pipeline = [
      { $match: { source: "admin", ...(jobId ? { jobId: new mongoose.Types.ObjectId(jobId) } : {}) } },
      { $sort: { clickedAt: -1, _id: -1 } },
      { $lookup: { from: "talents", localField: "talentId", foreignField: "_id", pipeline: [{ $project: { fullName: 1, firstName: 1, lastName: 1 } }], as: "talent" } },
      { $unwind: { path: "$talent", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "adminjobs", localField: "jobId", foreignField: "_id", pipeline: [{ $project: { isDeleted: 1 } }], as: "jobRecords" } },
      { $set: { talentName: { $trim: { input: { $ifNull: ["$talent.fullName", { $concat: [{ $ifNull: ["$talent.firstName", ""] }, " ", { $ifNull: ["$talent.lastName", ""] }] }] } } } } },
    ];
    if (q.trim()) {
      const regex = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      pipeline.push({ $match: { $or: ["talentName", "display.jobTitle", "display.companyName", "destinationUrl"].map(field => ({ [field]: regex })) } });
    }
    pipeline.push({ $facet: {
      items: [{ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) },
        { $project: { _id: 0, id: "$_id", source: { $literal: "admin" }, clickedAt: 1, destinationUrl: 1,
          talent: { id: { $toString: "$talentId" }, name: { $cond: [{ $ne: ["$talentName", ""] }, "$talentName", "Talent unavailable"] }, exists: { $ne: [{ $ifNull: ["$talent._id", null] }, null] } },
          job: { id: { $toString: "$jobId" }, title: { $ifNull: ["$display.jobTitle", "Job unavailable"] }, companyName: { $ifNull: ["$display.companyName", ""] },
            exists: { $and: [{ $gt: [{ $size: "$jobRecords" }, 0] }, { $ne: [{ $arrayElemAt: ["$jobRecords.isDeleted", 0] }, true] }] } },
        } }], totals: [{ $count: "total" }],
    } });
    const [result] = await Activity.aggregate(pipeline);
    const total = result?.totals[0]?.total || 0;
    res.json({ success: true, source: "admin", activities: result?.items || [], pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    res.status(503).json({ success: false, message: "Unable to load external activity. Please try again." });
  }
}
