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
      required() { return !this.attachments?.length; },
      maxlength: 10000,
      validate: {
        validator(value) { return typeof value === "string" && (Boolean(value.trim()) || Boolean(this.attachments?.length)); },
        message: "Message text is required.",
      },
    },
    attachments: { type: [{
      _id: false,
      id: { type: String, required: true },
      name: { type: String, required: true },
      mime: { type: String, enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"], required: true },
      size: { type: Number, required: true, min: 1, max: 10000000 },
      storageKey: { type: String, required: true, select: false },
      sha256: { type: String, required: true, select: false },
    }], default: undefined, validate: value => !value || value.length <= 5 },
    clientMessageId: { type: String, minlength: 16, maxlength: 128, match: /^[a-zA-Z0-9_-]+$/ },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, autoIndex: false }
);

messageSchema.set("toJSON", { transform(_doc, result) {
  for (const file of result.attachments || []) { delete file.storageKey; delete file.sha256; }
  return result;
} });

// Explicit rollout only: do not build message indexes during application startup.
messageSchema.index({ sender: 1, senderModel: 1, createdAt: -1, _id: -1, recipient: 1, recipientModel: 1 }, { name: "message_sender_timeline" });
messageSchema.index({ recipient: 1, recipientModel: 1, createdAt: -1, _id: -1, sender: 1, senderModel: 1 }, { name: "message_recipient_timeline" });

messageSchema.index({ sender: 1, senderModel: 1, clientMessageId: 1 }, {
  name: "message_sender_request_unique", unique: true,
  partialFilterExpression: { clientMessageId: { $type: "string" } },
});

messageSchema.index({ recipient: 1, recipientModel: 1, createdAt: -1, sender: 1, senderModel: 1 }, {
  name: "message_unread_recipient", partialFilterExpression: { read: false },
});

export default mongoose.model("Message", messageSchema);
