import mongoose from "mongoose";

// Independent from Employer Job. Attribution is the immutable Admin database ID.
// Provision collection/indexes deliberately before deployment.
const schema = new mongoose.Schema({
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, immutable: true },
  jobTitle: { type: String, required: true, trim: true },
  jobDescription: { type: String, required: true, trim: true },
  organization: { type: String, trim: true },
  category: { type: String, trim: true },
  jobCategory: { type: String, enum: ["Full Time", "Part Time", "Contract", "Freelance", "Internship"] },
  jobApplyType: { type: String, enum: ["Full Time", "Part Time", "Contract", "Freelance", "Internship"] },
  featuredImage: { url: String, public_id: String },
  gallery: [{ url: String, type: { type: String, enum: ["image", "video"] }, public_id: String }],
  workType: { type: String, enum: ["Remote", "On-site", "Hybrid"], default: "On-site" },
  experience: { type: String },
  careerLevel: { type: String },
  qualification: { type: String },
  address: { type: String },
  location: { type: String },
  salary: { type: { type: String, enum: ["Hour", "Day", "Week", "Month", "Year", "Project"] }, min: Number, max: Number },
  deadlineDate: Date,
  status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
  flagged: { type: Boolean, default: false },
  applicantsCount: { type: Number, default: 0, min: 0 },
  revision: { type: Number, default: 0, min: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  creationFingerprint: { type: String, required: true, immutable: true, select: false },
}, { timestamps: true, versionKey: false, collection: "adminjobs", autoCreate: false, autoIndex: false, strict: "throw" });
schema.index({ isDeleted: 1, createdAt: -1, _id: -1 });
export default mongoose.model("AdminJob", schema);
