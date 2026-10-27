// backend/controllers/savedJobController.js
import SavedJob from "../models/SavedJob.js";
import { createHash } from "node:crypto";
import { findPublicAdminJob } from "../services/publicAdminJob.js";

// Get saved jobs for a user
export const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const savedJobs = await SavedJob.find({ userId }).populate({ path: "jobId", match: { isDeleted: false } }).sort({ savedAt: -1 });
    for (const saved of savedJobs) {
      if (saved.jobId && saved.source !== "admin") await saved.jobId.populate({ path: "employer", select: "companyName" });
    }

   
    const jobs = savedJobs
      .filter(sj => sj.jobId && sj.jobId.isDeleted === false)
      .map(sj => ({
        id: sj.jobId._id,
        source: sj.source || "employer",
        title: sj.jobId.jobTitle,
        company: sj.source === "admin" ? sj.jobId.organization || "QNDUIT" : sj.jobId.employer?.companyName || "Unknown",
        category: sj.jobId.jobCategory,
        datePost: sj.jobId.createdAt,
      }));

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add a job to saved jobs
export const addSavedJob = async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.body;

    if (typeof jobId !== "string" || !/^[a-f\d]{24}$/i.test(jobId)) return res.status(400).json({ success: false, message: "Invalid job ID." });
    const source = req.jobSource || "employer";
    if (source === "admin") {
      if (req.user.role !== "talent") return res.status(403).json({ success: false, message: "Only Talent accounts can save jobs" });
      if (!await findPublicAdminJob(jobId)) return res.status(404).json({ success: false, message: "Job unavailable" });
      const _id = createHash("sha256").update(`saved:admin:${userId}:${jobId.toLowerCase()}`).digest("hex").slice(0, 24);
      await SavedJob.updateOne({ _id }, { $setOnInsert: { userId, jobId, source, jobModel: "AdminJob", savedAt: new Date() } }, { upsert: true });
      return res.json({ success: true });
    }
    const exists = await SavedJob.findOne({ userId, jobId, source: { $ne: "admin" } });
    if (exists) return res.status(400).json({ success: false, message: "Job already saved" });

    const savedJob = new SavedJob({ userId, jobId });
    await savedJob.save();

    res.json({ success: true, savedJob });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Remove a saved job
export const removeSavedJob = async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.body;
    

    await SavedJob.findOneAndDelete({ userId, jobId, source: req.jobSource === "admin" ? "admin" : { $ne: "admin" } });

    res.json({ success: true, message: "Job removed from saved jobs" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};