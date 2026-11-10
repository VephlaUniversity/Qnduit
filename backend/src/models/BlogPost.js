import mongoose from "mongoose";
import { BLOG_LIMITS, blogImageUrl, validateBlogContent } from "../utils/blogValidation.js";

const text = (maxlength) => ({ type: String, required: true, trim: true, maxlength, validate: value => !/[<>]/.test(value) });
const block = new mongoose.Schema({ type: { type: String, enum: ["paragraph", "heading", "quote", "image"], required: true }, text: String, src: String }, { _id: false, strict: "throw" });
const schema = new mongoose.Schema({
  title: text(BLOG_LIMITS.title), excerpt: text(BLOG_LIMITS.excerpt), category: text(BLOG_LIMITS.category), author: text(BLOG_LIMITS.author),
  coverImage: { url: { type: String, required: true, validate: blogImageUrl }, public_id: { type: String, required: true } },
  content: { type: [block], required: true, validate: { validator(value) { try { validateBlogContent(value.map(item => item.toObject())); return true; } catch { return false; } }, message: "Invalid article content." } },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, immutable: true },
  status: { type: String, enum: ["draft", "published"], default: "draft", required: true },
  publishedAt: { type: Date, default: null },
  revision: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
}, { timestamps: true, versionKey: false, strict: "throw", collection: "blogposts", autoCreate: false, autoIndex: false });
schema.pre("validate", function () {
  if (this.status === "published" && !this.publishedAt || this.status === "draft" && this.publishedAt) this.invalidate("publishedAt", "Publication date must match publication status.");
});
schema.index({ status: 1, publishedAt: -1, _id: -1 });
schema.index({ createdAt: -1, _id: -1 });
export default mongoose.model("BlogPost", schema);
