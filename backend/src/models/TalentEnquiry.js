import mongoose from "mongoose";

const talentEnquirySchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
      index: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    status: {
      type: String,
      enum: ["new", "read", "archived"],
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

// Explicit index rollout; no index creation during application startup.
talentEnquirySchema.index(
  { talent: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "talent_enquiry_status_timeline" }
);

talentEnquirySchema.index(
  { talent: 1, createdAt: -1, _id: -1 },
  { name: "talent_enquiry_timeline" }
);

export default mongoose.model("TalentEnquiry", talentEnquirySchema);