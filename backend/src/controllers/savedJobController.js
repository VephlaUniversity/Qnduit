// backend/controllers/savedJobController.js
import SavedJob from "../models/SavedJob.js";

// Get saved jobs for a user
export const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user._id;

    const savedJobs = await SavedJob.find({ userId })
      .populate({
        path: "jobId", 
        match: { isDeleted: false }, 
        populate: {
          path: "employer", 
          select: "companyName email phone", 
        },
      })
      .sort({ savedAt: -1 });

   
    const jobs = savedJobs
      .filter(sj => sj.jobId) 
      .map(sj => ({
        id: sj.jobId._id,
        title: sj.jobId.jobTitle,
        company: sj.jobId.employer?.companyName || "Unknown",
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

    const exists = await SavedJob.findOne({ userId, jobId });
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
    

    await SavedJob.findOneAndDelete({ userId, jobId });

    res.json({ success: true, message: "Job removed from saved jobs" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};