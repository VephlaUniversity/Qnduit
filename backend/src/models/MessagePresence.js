import mongoose from "mongoose";

// One shared row per typed account, not per tab or heartbeat. No TTL: a missing
// record is unknown; deleting expired rows would lose confirmed-offline evidence.
const presenceSchema = new mongoose.Schema({
  _id: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  ownerModel: { type: String, enum: ["Talent", "Employer"], required: true },
  heartbeatAt: Date,
}, { autoIndex: false, versionKey: false });
export default mongoose.model("MessagePresence", presenceSchema);
