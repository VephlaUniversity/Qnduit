import mongoose from "mongoose";

const employerPaymentSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["flutterwave"],
      default: "flutterwave",
      required: true,
    },

    txRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    transactionId: {
      type: String,
      index: true,
      sparse: true,
    },

    flwRef: {
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
      default: "USD",
      uppercase: true,
    },

    plan: {
      type: String,
      enum: ["bronze", "silver", "platinum"],
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

export default mongoose.model(
  "EmployerPayment",
  employerPaymentSchema
);