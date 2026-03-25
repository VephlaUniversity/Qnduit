import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected", "hired"],
      default: "pending",
    },

    coverLetter: {
      type: String,
      default: "",
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobApplication", jobApplicationSchema);