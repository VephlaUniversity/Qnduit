import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    attendee: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    time: {
      type: String,
      required: true,
    },

    duration: {
      type: String,
      default: "30m",
    },

    message: {
      type: String,
    },

    zoomLink: {
      type: String,
    },

    status: {
      type: String,
      enum: ["scheduled", "rescheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", MeetingSchema);
