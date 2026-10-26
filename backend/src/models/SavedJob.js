import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Talent",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "jobModel",
    required: true,
  },
  jobModel: { type: String, enum: ["Job", "AdminJob"], default: "Job" },
  source: { type: String, enum: ["employer", "admin"], default: "employer" },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("SavedJob", savedJobSchema);