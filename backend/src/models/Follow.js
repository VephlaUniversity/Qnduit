import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
      index: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

followSchema.index(
  { talent: 1, employer: 1 },
  { unique: true }
);

const Follow = mongoose.model("Follow", followSchema);

export default Follow;