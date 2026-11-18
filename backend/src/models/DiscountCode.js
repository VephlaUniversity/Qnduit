import mongoose from "mongoose";

export const discountTermsSchema = new mongoose.Schema({
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  basisPoints: Number,
  amountMinor: Number,
  currency: String,
}, { _id: false });

// The normalized code is the unique identifier, enforced by MongoDB's _id index.
const discountCodeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  terms: { type: discountTermsSchema, required: true },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  maxTotalUses: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isSafeInteger, message: "Enter a positive whole number of uses." },
  },
  maxUsesPerUser: { type: Number, required: true, enum: [1] },
  heldUses: { type: Number, required: true, min: 0, default: 0 },
  successfulUses: { type: Number, required: true, min: 0, default: 0 },
  eligiblePlans: { type: [String], required: true },
  active: { type: Boolean, required: true },
  revision: { type: Number, required: true, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
}, { timestamps: true, strict: "throw" });

// Existing codes predate accounting. The first hold initializes heldUses with $inc.
export const discountCapacityUsed = { $add: [{ $ifNull: ["$heldUses", 0] }, { $ifNull: ["$successfulUses", 0] }] };
export const discountRevisionFilter = revision => revision === 0
  ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };

export default mongoose.model("DiscountCode", discountCodeSchema);
