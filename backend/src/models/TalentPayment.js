import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
      required: true,
    },

    stripePaymentIntentId: {
      type: String,
      index: true,
      sparse: true,
    },

    stripeInvoiceId: {
      type: String,
      index: true,
      sparse: true,
    },

    stripeCheckoutSessionId: {
      type: String,
      index: true,
      sparse: true,
    },

    stripeSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "usd",
      lowercase: true,
    },

    plan: {
      type: String,
      enum: ["public"],
      required: true,
    },

    type: {
      type: String,
      enum: [
        "subscription",
        "subscription_renewal",
        "refund",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "successful",
        "failed",
        "refunded",
      ],
      default: "pending",
    },

    paidAt: {
      type: Date,
    },

    failureReason: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TalentPayment", paymentSchema);