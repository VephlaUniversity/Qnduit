import mongoose from "mongoose";

const employerTalentFollowSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

employerTalentFollowSchema.index(
  { employer: 1, talent: 1 },
  { unique: true }
);

export default mongoose.model(
  "EmployerTalentFollow",
  employerTalentFollowSchema
);