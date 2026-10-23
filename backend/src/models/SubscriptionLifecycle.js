import mongoose from "mongoose";

const lifecycle = new mongoose.Schema({
  _id: String, // role:accountId; the common serialization point for all writers.
  generation: { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  pendingPayment: mongoose.Schema.Types.ObjectId,
  activePayment: mongoose.Schema.Types.ObjectId,
  adminCanceledAt: Date,
}, { timestamps: true });
const cancellation = new mongoose.Schema({
  _id: String,
  role: { type: String, enum: ["talent", "employer"], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, required: true },
  fingerprint: { type: String, required: true },
  generation: Number,
  lastTxRef: String,
  lastTransactionId: String,
  canceledAt: Date,
}, { timestamps: true });

export const SubscriptionLifecycle = mongoose.model("SubscriptionLifecycle", lifecycle);
export const SubscriptionCancellation = mongoose.model("SubscriptionCancellation", cancellation);

// Verified provider evidence is retained even when it cannot activate access.
// Unlinked renewal receipts intentionally carry no guessed account ownership.
const charge = new mongoose.Schema({
  _id: String, // flutterwave:verified transaction ID
  transactionId: { type: String, required: true },
  txRef: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  flwRef: String,
  role: { type: String, enum: ["talent", "employer"] },
  account: mongoose.Schema.Types.ObjectId,
  payment: mongoose.Schema.Types.ObjectId,
  outcome: String,
}, { timestamps: true });
export const SubscriptionCharge = mongoose.model("SubscriptionCharge", charge);

const downgrade = new mongoose.Schema({
  _id: String, // Deterministic activation key: one pending action per activation.
  role: { type: String, enum: ["talent", "employer"], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, required: true },
  generation: { type: Number, required: true },
  activationFingerprint: { type: String, required: true },
  lastTxRef: String,
  lastTransactionId: String,
  fromPlan: { type: String, required: true },
  toPlan: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestedAt: { type: Date, required: true },
  status: { type: String, enum: ["pending"], required: true, default: "pending" },
}, { timestamps: true });
export const SubscriptionDowngrade = mongoose.model("SubscriptionDowngrade", downgrade);
