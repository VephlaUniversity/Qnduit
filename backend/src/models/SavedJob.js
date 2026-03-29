import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Talent",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("SavedJob", savedJobSchema);