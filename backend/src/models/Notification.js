import mongoose from "mongoose";
const schema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipientType: { type: String, enum: ["talent", "employer"], required: true },
  kind: { type: String, enum: ["application", "application-status"], required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ["reviewed", "shortlisted", "rejected", "hired"] },
  occurredAt: { type: Date, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true, autoIndex: false });
// _id is the immutable source event ID: built-in uniqueness protects retries.
schema.index({ recipientType: 1, recipientId: 1, createdAt: -1, _id: -1 });
schema.index({ recipientType: 1, recipientId: 1, readAt: 1 });
export default mongoose.model("Notification", schema);
