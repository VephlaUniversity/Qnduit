import mongoose from "mongoose";

// _id is the durable, unique ticket/actor/request identity. No TTL: an
// uncertain upload/save must never become eligible for blind deletion/retry.
const schema = new mongoose.Schema({
  _id: String,
  ticket: { type: mongoose.Schema.Types.ObjectId, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  fingerprint: { type: String, required: true },
  replyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  directory: String,
  state: { type: String, enum: ["processing", "committed", "failed", "uncertain"], required: true },
}, { timestamps: true, autoIndex: false });
export default mongoose.model("SupportReplyOperation", schema);
