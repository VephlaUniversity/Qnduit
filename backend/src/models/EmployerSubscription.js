import mongoose from "mongoose";

const employerSubscriptionSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
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

    plan: {
      type: String,
      enum: ["bronze", "silver", "platinum"],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "EmployerSubscription",
  employerSubscriptionSchema
);