import mongoose from "mongoose";

const supportReplySchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      required() { return !this.authorRole || this.authorRole === "admin"; },
    },
    authorId: { type: mongoose.Schema.Types.ObjectId },
    authorRole: { type: String, enum: ["talent", "employer", "admin"] },
    authorName: String,
    adminName: {
      type: String,
      default: "Support Team",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    // No inferred legacy ownership: only new tickets receive this server identity.
    ownerId: { type: mongoose.Schema.Types.ObjectId },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["talent", "employer"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    replies: {
      type: [supportReplySchema],
      default: [],
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ ownerId: 1, userType: 1, createdAt: -1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model("SupportTicket", supportTicketSchema);