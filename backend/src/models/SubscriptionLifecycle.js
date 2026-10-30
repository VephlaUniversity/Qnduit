import mongoose from "mongoose";
import { EMPLOYER_PLAN_ORDER, PLAN_REQUEST_ID, validateEmployerPlanHistory } from "../utils/employerPlanRequest.js";

const lifecycle = new mongoose.Schema({
  _id: String, // role:accountId; the common serialization point for all writers.
  generation: { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  pendingPayment: mongoose.Schema.Types.ObjectId,
  activePayment: mongoose.Schema.Types.ObjectId,
  adminCanceledAt: Date,
}, { timestamps: true });

const cancellation = new mongoose.Schema({
  _id: String, // Idempotency key: requestId
  role: {
    type: String,
    enum: ["talent", "employer"],
    required: true,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Populated for admin-initiated cancellations.
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },

  // Records who initiated the cancellation.
  actorType: {
    type: String,
    enum: ["user", "admin"],
    required: true,
  },
  actorAccount: mongoose.Schema.Types.ObjectId,

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

const v2History = function () { return this.requestVersion === 2; };
const downgrade = new mongoose.Schema({
  _id: String, // Legacy: activation key. V2: Employer-scoped request idempotency key.
  role: { type: String, enum: ["talent", "employer"], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: v2History },
  subscription: { type: mongoose.Schema.Types.ObjectId, required() { return this.requestVersion !== 2; }, immutable: v2History },
  generation: { type: Number, required: true, immutable: v2History },
  activationFingerprint: { type: String, required: true, immutable: v2History },
  lastTxRef: String,
  lastTransactionId: String,
  fromPlan: { type: String, required: true, immutable: v2History },
  toPlan: { type: String, required: true, immutable: v2History },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: v2History },
  requestedAt: { type: Date, required: true, immutable: v2History },
  status: { type: String, enum: ["pending", "awaiting_payment", "scheduled", "applied", "failed", "cancelled", "superseded"], required: true, default: "pending" },
  // Opt-in only. Existing Talent/Admin downgrade writers remain legacy writers.
  requestVersion: { type: Number, enum: [2], immutable: true },
  actionType: { type: String, enum: ["upgrade", "downgrade"], required() { return this.requestVersion === 2; }, immutable: true },
  actorRole: { type: String, enum: ["employer", "admin"], required() { return this.requestVersion === 2; }, immutable: true },
  requestId: { type: String, match: PLAN_REQUEST_ID, required() { return this.requestVersion === 2; }, immutable: true },
  requestFingerprint: { type: String, match: /^[a-f\d]{64}$/, required() { return this.requestVersion === 2; }, immutable: true },
  executionPolicy: { type: String, enum: ["immediate-downgrade-v1", "payment-upgrade-v1"], immutable: true },
  sourcePeriodStart: { type: Date, immutable: v2History },
  sourcePeriodEnd: { type: Date, immutable: v2History },
  appliedPlan: { type: String, enum: EMPLOYER_PLAN_ORDER },
  outcome: { type: String, enum: ["recorded", "awaiting_payment", "scheduled", "applied", "failed", "cancelled", "superseded"], required() { return this.requestVersion === 2; } },
  outcomeReason: { type: String, maxlength: 512 },
  scheduledEffectiveAt: Date,
  actualEffectiveAt: Date,
  // Source activation evidence versus a future payment funding this request.
  sourcePayment: { type: mongoose.Schema.Types.ObjectId, ref: "EmployerPayment", immutable: v2History },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "EmployerPayment" },
  appliedGeneration: { type: Number, min: 0, validate: Number.isSafeInteger },
}, { timestamps: true });
downgrade.pre("validate", function () {
  if (this.requestVersion !== 2 && this.status !== "pending") this.invalidate("status", "Legacy downgrade records remain pending.");
  for (const [field, message] of validateEmployerPlanHistory(this)) this.invalidate(field, message);
});
export const SubscriptionDowngrade = mongoose.model("SubscriptionDowngrade", downgrade);
