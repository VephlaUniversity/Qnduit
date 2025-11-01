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
    },
    verificationCode: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    resume: {
      type: String, // will store the file URL/path
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
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

export default mongoose.model("Talent", talentSchema);
