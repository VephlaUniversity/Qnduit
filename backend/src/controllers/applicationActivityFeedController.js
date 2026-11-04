import JobApplication from "../models/JobApplication.js";
import AdminJobApplication from "../models/AdminJobApplication.js";
import Activity from "../models/ExternalApplicationActivity.js";
import { publicImageUrl } from "../utils/publicTalentProfile.js";

const literal = value => ({ $literal: value });
const string = field => ({ $ifNull: [field, ""] });
const jobProjection = { jobTitle: 1, location: 1, category: 1, jobCategory: 1, workType: 1,
  jobApplyType: 1, employer: 1, organization: 1, "featuredImage.url": 1 };

function internalStages(talentId, source, included) {
  const employer = source === "employer";
  return [
    { $match: included ? { applicantId: talentId } : { _id: { $exists: false } } },
    { $lookup: { from: employer ? "jobs" : "adminjobs", localField: "jobId", foreignField: "_id",
      pipeline: [{ $project: jobProjection }], as: "job" } },
    { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
    ...(employer ? [
      { $lookup: { from: "employers", localField: "job.employer", foreignField: "_id",
        pipeline: [{ $project: { companyName: 1, displayName: 1, accountType: 1, "logo.url": 1 } }], as: "company" } },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    ] : []),
    { $project: {
      _id: 0, id: { $concat: [`internal:${source}:`, { $toString: "$_id" }] },
      kind: literal("internal"), source: literal(source), label: literal("Internal Application"),
      jobId: { $toString: "$jobId" }, jobExists: { $ne: [{ $ifNull: ["$job._id", null] }, null] },
      occurredAt: { $ifNull: ["$appliedAt", { $ifNull: ["$createdAt", new Date(0)] }] },
      status: string("$status"), destinationUrl: literal(null),
      imageUrl: employer ? { $ifNull: ["$job.featuredImage.url", string("$company.logo.url")] } : string("$job.featuredImage.url"),
      display: {
        jobTitle: { $ifNull: ["$job.jobTitle", "Job no longer available"] },
        companyName: employer ? { $cond: [{ $eq: ["$company.accountType", "individual"] },
          { $ifNull: ["$company.displayName", string("$company.companyName")] }, string("$company.companyName")] }
          : { $ifNull: ["$job.organization", "QNDUIT"] },
        location: string("$job.location"), category: { $ifNull: ["$job.jobCategory", string("$job.category")] },
        workType: string("$job.workType"), jobApplyType: string("$job.jobApplyType"),
      },
    } },
  ];
}

function externalStages(talentId, source) {
  return [
    { $match: { talentId, ...(source === "all" ? {} : { source }) } },
    // Select one complete recorded event, never a mixture of snapshot fields.
    // Count all opens before search/pagination; reads leave the events untouched.
    { $sort: { clickedAt: -1, _id: -1 } },
    { $group: { _id: { jobId: "$jobId", source: "$source" },
      latest: { $first: "$$ROOT" }, totalOpens: { $sum: 1 } } },
    { $replaceRoot: { newRoot: { $mergeObjects: ["$latest", { totalOpens: "$totalOpens" }] } } },
    // Current jobs supply existence only. History always uses recorded snapshots.
    { $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", pipeline: [{ $project: { _id: 1 } }], as: "employerJob" } },
    { $lookup: { from: "adminjobs", localField: "jobId", foreignField: "_id", pipeline: [{ $project: { _id: 1 } }], as: "adminJob" } },
    { $project: {
      _id: 0, id: { $concat: ["external:", "$source", ":", { $toString: "$jobId" }] },
      kind: literal("external"), source: 1, label: literal("External Application"),
      jobId: { $toString: "$jobId" }, occurredAt: "$clickedAt", status: literal(null), destinationUrl: 1, totalOpens: 1,
      jobExists: { $gt: [{ $size: { $cond: [{ $eq: ["$source", "admin"] }, "$adminJob", "$employerJob"] } }, 0] },
      imageUrl: literal(""),
      display: Object.fromEntries(["jobTitle", "companyName", "location", "category", "workType", "jobApplyType"]
        .map(key => [key, string(`$display.${key}`)])),
    } },
  ];
}

export async function getApplicationActivityFeed(req, res) {
  res.set("Cache-Control", "private, no-store");
  const { q = "", type = "all", source = "all", page = "1", limit = "20" } = req.query;
  if (Object.keys(req.query).some(key => !["q", "type", "source", "page", "limit"].includes(key)) ||
    typeof q !== "string" || q.length > 200 || !["all", "internal", "external"].includes(type) ||
    !["all", "employer", "admin"].includes(source) || typeof page !== "string" || !/^[1-9]\d*$/.test(page) ||
    typeof limit !== "string" || !/^[1-9]\d*$/.test(limit) || Number(page) > 100000 || Number(limit) > 50) {
    return res.status(400).json({ success: false, message: "Invalid activity filters or pagination." });
  }
  try {
    const internal = type !== "external";
    const pipeline = internalStages(req.user._id, "employer", internal && source !== "admin");
    if (internal && source !== "employer") pipeline.push({ $unionWith: {
      coll: AdminJobApplication.collection.name, pipeline: internalStages(req.user._id, "admin", true),
    } });
    if (type !== "internal") pipeline.push({ $unionWith: {
      coll: Activity.collection.name, pipeline: externalStages(req.user._id, source),
    } });
    if (q.trim()) {
      const regex = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      pipeline.push({ $match: { $or: ["display.jobTitle", "display.companyName", "display.location", "display.category",
        "display.workType", "status", "label", "destinationUrl"].map(field => ({ [field]: regex })) } });
    }
    pipeline.push({ $facet: {
      items: [{ $sort: { occurredAt: -1, id: -1 } }, { $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }],
      totals: [{ $count: "total" }],
    } });
    const [result] = await JobApplication.aggregate(pipeline);
    const total = result?.totals[0]?.total || 0;
    res.json({ success: true, activities: (result?.items || []).map(row => ({ ...row, imageUrl: publicImageUrl(row.imageUrl) })),
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    res.status(503).json({ success: false, message: "Unable to load your application activity. Please try again." });
  }
}
