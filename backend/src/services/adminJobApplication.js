import { internalApplicationFilter, usesInternalApplications } from "../utils/jobApplicationMetadata.js";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import AdminJob from "../models/AdminJob.js";
import AdminJobApplication from "../models/AdminJobApplication.js";
import { availableAdminJob } from "./publicAdminJob.js";

export async function applyForAdminJob(req, res, next) {
  const id = req.body?.jobId;
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ success: false, message: "Invalid job ID." });
  // Reject External requests before starting the existing Internal transaction.
  try {
    const job = await AdminJob.findOne({ _id: id, ...availableAdminJob() }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found or no longer available" });
    if (!usesInternalApplications(job)) return res.status(400).json({ success: false, code: "JOB_APPLICATION_EXTERNAL", message: "This job does not accept QNDUIT applications. Use its application link." });
  } catch (error) { return next(error); }
  // Deterministic primary key also protects replay before the secondary index is provisioned.
  const applicationId = new mongoose.Types.ObjectId(createHash("sha256").update(`admin:${id.toLowerCase()}:talent:${req.user._id}`).digest("hex").slice(0, 24));
  const session = await mongoose.startSession();
  try {
    let application;
    await session.withTransaction(async () => {
      if (await AdminJobApplication.exists({ _id: applicationId }).session(session)) throw Object.assign(new Error("You already applied for this job"), { status: 400 });
      // A write to the job serializes application eligibility against close/delete/edit races.
      const job = await AdminJob.findOneAndUpdate({ _id: id, ...availableAdminJob(), $and: [internalApplicationFilter()] },
        { $inc: { applicantsCount: 1 } }, { new: true, session });
      if (!job) throw Object.assign(new Error("Job not found or no longer available"), { status: 404 });
      [application] = await AdminJobApplication.create([{ _id: applicationId, jobId: job._id,
        applicantId: req.user._id, postedBy: job.postedBy }], { session });
    });
    return res.status(201).json({ success: true, message: "Application submitted successfully", application: {
      _id: application._id, source: "admin", jobId: application.jobId, applicantId: application.applicantId,
      status: application.status, appliedAt: application.appliedAt, createdAt: application.createdAt,
    } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "You already applied for this job" });
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  } finally { await session.endSession(); }
}
