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
      ref: "Talent",
      required: true,
    },

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },

    employerArchivedAt: { type: Date, default: null },
    employerArchivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", default: null },

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
    notificationOutbox: { type: [{
      kind: { type: String, enum: ["application", "application-status"], required: true },
      recipientType: { type: String, enum: ["talent", "employer"], required: true },
      recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
      occurredAt: { type: Date, required: true },
      status: { type: String, enum: ["reviewed", "shortlisted", "rejected", "hired"] },
    }], default: undefined, select: false },
    notificationNextAttemptAt: { type: Date, select: false },
    notificationAttempts: { type: Number, select: false },
  },
  { timestamps: true, autoIndex: false }
);

const hideNotificationIntent = (_doc, result) => {
  delete result.notificationOutbox;
  delete result.notificationNextAttemptAt;
  delete result.notificationAttempts;
  return result;
};
jobApplicationSchema.set("toJSON", { transform: hideNotificationIntent });
jobApplicationSchema.set("toObject", { transform: hideNotificationIntent });
jobApplicationSchema.index({ notificationNextAttemptAt: 1, _id: 1 }, {
  partialFilterExpression: { notificationNextAttemptAt: { $exists: true } },
});

jobApplicationSchema.index(
  { jobId: 1, applicantId: 1 },
  { unique: true }
);

export default mongoose.model("JobApplication", jobApplicationSchema);
