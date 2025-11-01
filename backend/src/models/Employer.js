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
  },
  { timestamps: true }
);

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
