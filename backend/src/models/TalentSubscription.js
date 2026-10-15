import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
      unique: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["flutterwave"],
      default: "flutterwave",
      required: true,
    },

    flutterwavePlanId: {
      type: String,
      required: true,
      index: true,
    },

    flutterwaveCustomerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    plan: {
      type: String,
      enum: ["public"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      default: "pending",
    },

    currentPeriodStart: {
      type: Date,
    },

    currentPeriodEnd: {
      type: Date,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    canceledAt: {
      type: Date,
    },

    endedAt: {
      type: Date,
    },

    lastTransactionId: {
      type: String,
      index: true,
      sparse: true,
    },

    lastTxRef: {
      type: String,
      index: true,
      sparse: true,
    },

    paymentPlanId: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "TalentSubscription",
  subscriptionSchema
);