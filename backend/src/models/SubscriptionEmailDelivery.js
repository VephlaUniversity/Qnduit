import mongoose from "mongoose";

// No TTL/lease: elapsed time must never release a possibly executing send.
const gate = new mongoose.Schema({
  _id: String,
  pending: { type: String, default: null },
  lastAttemptAt: Date,
  attemptTimes: { type: [Date], default: [] },
});
const attempt = new mongoose.Schema({
  _id: String, // Client-generated operation UUID; never contains invoice data.
  scope: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ["talent", "employer"], required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, required: true },
  fingerprint: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "failed", "uncertain", "blocked"], default: "pending" },
  retryAt: Date,
}, { timestamps: true });

export const SubscriptionEmailGate = mongoose.model("SubscriptionEmailGate", gate);
export const SubscriptionEmailAttempt = mongoose.model("SubscriptionEmailAttempt", attempt);
