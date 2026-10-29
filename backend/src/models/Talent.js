import mongoose from "mongoose";
import bcrypt from "bcrypt";

const talentSchema = new mongoose.Schema(
{
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  firstName: String,
  lastName: String,

  password: {
    type: String,
    required: true,
    minlength: 8,
  },

  // Admin badge only. isVerified remains the legacy email/login/access flag.
  verificationBadgeOverride: { type: Boolean, default: null },
  verificationBadgeDecidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", select: false },
  verificationBadgeDecidedAt: { type: Date, select: false },
  verificationCode: String,
  isVerified: {
    type: Boolean,
    default: false,
  },

  accountStatus: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
    index: true,
  },

  resetPasswordToken: {
    type: String,
    default: undefined,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined,
    select: false,
  },

  // ================= PROFILE =================
  fullName: String,
  dateOfBirth: String,
  phone: String,
  gender: String,
  age: String,
  jobTitle: String,
  qualification: String,
  experienceTime: String,
  language: String,
  location: String,
  address: String,
  aboutMe: String,
  showProfile: {
    type: String,
    enum: ["show", "hidden"],
    default: "show"
  },

  offeredSalary: String,
  salaryType: String,

  categories: [String],
  tags: [String],

  socialNetworks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    pinterest: String,
    youtube: String,
  },

  avatar: {
    url: String,
    public_id: String,
  },

  introVideo: {
    url: String,
    public_id: String,
  },

  resume: {
    url: String,
    public_id: String,
  },

  geoLocation: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
    },
  },

  profileCompleted: {
    type: Boolean,
    default: false,
  },

  profileUpdatedAt: Date,

  selectedPlan: {
    type: String,
    enum: ["free", "public", ""],
    default: "",
  },

  paymentStatus: {
    type: String,
    enum: [
      "none",
      "pending",
      "active",
      "past_due",
      "cancelled",
      "expired",
      "failed",
    ],
    default: "none",
  },

    // Public talent profile
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    publicProfileEnabled: {
      type: Boolean,
      default: false,
    },

    portfolioUrl: {
      type: String,
      trim: true,
    },

    experience: [
      {
        title: String,
        company: String,
        description: String,
        startDate: String,
        endDate: String,
      },
    ],

    portfolio: [
      {
        title: String,
        description: String,
        imageUrl: String,
        projectUrl: String,
        portfolioItemId: String,
        legacyImageValue: String,
        skills: {
          type: [String],
          default: undefined,
          validate: value => !value || (value.length <= 20 && value.every(skill => skill.length <= 80)),
        },
      },
    ],
  },
{ timestamps: true }
);

talentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

talentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

talentSchema.index({ geoLocation: "2dsphere" });

export default mongoose.model("Talent", talentSchema);
