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

  verificationCode: String,
  isVerified: {
    type: Boolean,
    default: false,
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
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0,0],
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
