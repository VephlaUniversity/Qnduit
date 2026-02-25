import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Talent",
      required: true,
    },
    cvFiles: [
      {
        url: String,
        public_id: String,
        type: {
          type: String,
          enum: ["PDF", "Doc", "Docx"],
        },
      },
    ],
    portfolioImages: [
      {
        url: String,
        public_id: String,
      },
    ],
    introVideo: {
      url: String,
      public_id: String,
    },
    aboutMe: String,
    education: [
      {
        academy: String,
        title: String,
        startDate: String,
        endDate: String,
        description: String,
      },
    ],
    experience: [
      {
        company: String,
        title: String,
        startDate: String,
        endDate: String,
        description: String,
      },
    ],
    skills: [
      {
        title: String,
        percent: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);