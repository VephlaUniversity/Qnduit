import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      // select: false,
    },
    accountType: {
      type: String,
      enum: ["institutional", "individual"],
      // required: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    aboutCompany: {
      type: String,
      trim: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
    },
    companyIndustry: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    aboutYou: {
      type: String,
      trim: true,
    },
    selectedPlan: {
      type: String,
      trim: true,
    },
    verificationCode: { 
      type: String 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    phone: {
      type: String,
      trim: true,
    },
    foundedYear: {
      type: Number,
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "50-120", "121-200", "200+"],
    },

    profileURL: {
      type: String,
      trim: true,
    },

    showProfile: {
      type: String,
      enum: ["show", "hidden"],
      default: "show",
    },
    categories: [
      {
        type: String,
        trim: true,
      }
    ],
    socialNetworks: {
      facebook: String,
      linkedin: String,
      twitter: String,
      pinterest: String,
      instagram: String,
      youtube: String,
    },
    introVideo: String,
    address: String,
    mapLocation: String,
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], 
      },
    },
    logo: {
      url: String,
      public_id: String,
    },
    gallery: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video"],
        },
        public_id: String,
      }
    ],
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    profileUpdatedAt: Date,
  },
  { timestamps: true }
);

employerSchema.index({ geoLocation: "2dsphere" });

employerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

employerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Employer", employerSchema);
