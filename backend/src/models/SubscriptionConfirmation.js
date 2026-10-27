import mongoose from "mongoose";

// Separate from Admin Invoice delivery. One immutable activation snapshot per
// role/payment; MongoDB's built-in unique _id is the deduplication constraint.
const schema = new mongoose.Schema({
  _id: String,
  role: { type: String, enum: ["talent", "employer"], required: true, immutable: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  payment: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  snapshot: { type: new mongoose.Schema({
    recipient: String,
    name: String,
    plan: String,
    amount: Number,
    currency: String,
    reference: String,
    transactionId: String,
    paidAt: Date,
    periodStart: Date,
    periodEnd: Date,
  }, { _id: false }), required: true, immutable: true },
  status: { type: String, enum: ["pending", "sending", "accepted", "failed", "uncertain"], default: "pending" },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  claimedAt: Date,
  acceptedAt: Date,
  outcome: String,
}, {
  timestamps: true,
  collection: "subscriptionconfirmations",
  // Deployment must provision this collection/index deliberately before use.
  autoCreate: false,
  autoIndex: false,
});
schema.index({ status: 1, nextAttemptAt: 1, _id: 1 });

export default mongoose.model("SubscriptionConfirmation", schema);
