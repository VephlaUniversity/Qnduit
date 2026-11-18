import mongoose from "mongoose";
import { discountTermsSchema } from "./DiscountCode.js";

const upgradeSchema = new mongoose.Schema({
  policy: { type: String, required: true },
  fromPlan: { type: String, required: true },
  generation: { type: Number, required: true },
  activationFingerprint: { type: String, required: true },
}, { _id: false });

const initializationSchema = new mongoose.Schema({
  state: { type: String, enum: ["initializing", "ready", "unconfirmed", "rejected"], required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, required: true },
  txRef: { type: String, required: true },
  checkoutUrl: String,
  providerExpiresAt: Date,
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  requestFingerprint: { type: String, required: true, immutable: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  role: { type: String, enum: ["talent", "employer"], required: true, immutable: true },
  code: { type: String, required: true, immutable: true },
  codeRevision: { type: Number, required: true, immutable: true },
  terms: { type: discountTermsSchema, required: true, immutable: true },
  plan: { type: String, required: true, immutable: true },
  currency: { type: String, required: true, immutable: true },
  originalMinor: { type: Number, required: true, immutable: true },
  discountMinor: { type: Number, required: true, immutable: true },
  payableMinor: { type: Number, required: true, immutable: true },
  firstEmployerPurchase: { type: Boolean, immutable: true },
  upgrade: { type: upgradeSchema, immutable: true },
  status: { type: String, enum: ["held", "redeemed", "released"], required: true },
  redemptionTransactionId: String,
  redeemedAt: Date,
  noChargeGrant: new mongoose.Schema({
    subscription: { type: mongoose.Schema.Types.ObjectId, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  }, { _id: false }),
  initialization: initializationSchema,
  releaseCheckAt: Date,
  release: new mongoose.Schema({
    reason: { type: String, enum: ["never_initialized", "provider_terminal"], required: true },
    releasedAt: { type: Date, required: true },
    evidence: new mongoose.Schema({
      txRef: String,
      terminalState: String,
      evidenceId: String,
    }, { _id: false }),
  }, { _id: false }),
}, { timestamps: true, strict: "throw" });

attemptSchema.index({ status: 1, releaseCheckAt: 1, _id: 1 });

// The built-in unique _id index protects one occupying attempt per account and code.
// A later successful redemption must retain this slot. A confirmed release may remove it.
const slotSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  attempt: { type: String, required: true },
}, { timestamps: true, strict: "throw" });

export const DiscountCheckoutAttempt = mongoose.model("DiscountCheckoutAttempt", attemptSchema);
export const DiscountAccountSlot = mongoose.model("DiscountAccountSlot", slotSchema);
