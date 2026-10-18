import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      required: true,
    },
    senderModel: {
      type: String,
      enum: ["Talent", "Employer"],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
    },
    recipientModel: {
      type: String,
      enum: ["Talent", "Employer"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 10000,
      validate: {
        validator: value => typeof value === "string" && Boolean(value.trim()),
        message: "Message text is required.",
      },
    },
    clientMessageId: { type: String, minlength: 16, maxlength: 128, match: /^[a-zA-Z0-9_-]+$/ },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, autoIndex: false }
);

// Explicit rollout only: do not build message indexes during application startup.
messageSchema.index({ sender: 1, senderModel: 1, createdAt: -1, _id: -1, recipient: 1, recipientModel: 1 }, { name: "message_sender_timeline" });
messageSchema.index({ recipient: 1, recipientModel: 1, createdAt: -1, _id: -1, sender: 1, senderModel: 1 }, { name: "message_recipient_timeline" });

messageSchema.index({ sender: 1, senderModel: 1, clientMessageId: 1 }, {
  name: "message_sender_request_unique", unique: true,
  partialFilterExpression: { clientMessageId: { $type: "string" } },
});

export default mongoose.model("Message", messageSchema);