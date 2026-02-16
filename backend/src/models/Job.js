import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    jobDescription: {
      type: String,
      required: true
    },

    category: {
      type: String,
      trim: true,
      index: true
    },

    jobCategory: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Freelance", "Internship"],
      index: true
    },

    jobApplyType: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Freelance", "Internship"]
    },

    salary: {
      type: {
        type: String,
        enum: ["Hour", "Day", "Week", "Month", "Year", "Project"]
      },
      min: Number,
      max: Number
    },

    experience: String,
    careerLevel: String,
    qualification: String,

    deadlineDate: Date,

    address: String,

    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },

    location: {
      type: String,
      index: true
    },

    featuredImage: {
      url: String,
      public_id: String
    },

    gallery: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video"]
        },
        public_id: String
      }
    ],

    applicantsCount: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "published",
      index: true
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

JobSchema.index({ geoLocation: "2dsphere" });

export default mongoose.model("Job", JobSchema);
