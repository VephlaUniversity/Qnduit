import mongoose from "mongoose";
// Independent of Employer applications and their existing unique index/outbox.
const schema = new mongoose.Schema({
  source: { type: String, enum: ["admin"], default: "admin", immutable: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "AdminJob", required: true, immutable: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: "Talent", required: true, immutable: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, immutable: true },
  status: { type: String, enum: ["pending", "reviewed", "shortlisted", "rejected", "hired"], default: "pending" },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: "adminjobapplications", autoIndex: false, autoCreate: false });
schema.index({ jobId: 1, applicantId: 1 }, { unique: true });
schema.index({ applicantId: 1, createdAt: -1 });
export default mongoose.model("AdminJobApplication", schema);
