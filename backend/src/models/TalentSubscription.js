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
      enum: ["stripe"],
      default: "stripe",
      required: true,
    },

    stripeCustomerId: {
      type: String,
      required: true,
      index: true,
    },

    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["public"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      default: "incomplete",
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TalentSubscription", subscriptionSchema);