import mongoose from "mongoose";

// A deterministic _id uses MongoDB's built-in unique index, without a new index migration.
const schema = new mongoose.Schema({
  _id: String,
  talent: { type: mongoose.Schema.Types.ObjectId, required: true },
  digest: { type: String, required: true },
  state: { type: String, enum: ["pending", "committed", "failed"], required: true },
}, { timestamps: true });
export default mongoose.model("PortfolioSave", schema);
