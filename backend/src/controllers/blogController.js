import BlogPost from "../models/BlogPost.js";
import { processBlogCover, blogCoverStorage } from "../services/blogCover.js";
import { validateBlogInput, validateBlogUpdate, validBlogId, blogPagination, blogFailure, publicBlogDTO, adminBlogDTO } from "../utils/blogValidation.js";

// Injectable boundaries keep isolated tests away from production DB/storage.
export function createBlogController({ Model = BlogPost, processCover = processBlogCover, storage = blogCoverStorage, now = () => new Date() } = {}) {
  const respond = work => async (req, res) => {
    try { await work(req, res); }
    catch (error) {
      const invalid = ["ValidationError", "CastError", "StrictModeError"].includes(error.name);
      res.status(error.status || (invalid ? 400 : 503)).json({ success: false, message: error.status ? error.message : invalid ? "Please check the blog details." : "The blog operation could not be confirmed. Refresh before retrying.", ...(error.status && error.errors ? { errors: error.errors } : {}) });
    }
  };
  const published = () => ({ status: "published", publishedAt: { $ne: null } });
  const list = admin => respond(async (req, res) => {
    const { page, limit } = blogPagination(req.query);
    const filter = admin ? {} : published();
    const posts = await Model.find(filter).sort(admin ? { createdAt: -1, _id: -1 } : { publishedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await Model.countDocuments(filter);
    res.json({ success: true, data: posts.map(post => admin ? adminBlogDTO(post) : publicBlogDTO(post)), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  });
  return {
    listPublic: list(false), listAdmin: list(true),
    adminDetail: respond(async (req, res) => {
      if (!validBlogId(req.params.id)) throw blogFailure(404, "Blog post not found.");
      const post = await Model.findOne({ _id: req.params.id }).lean();
      if (!post) throw blogFailure(404, "Blog post not found.");
      res.json({ success: true, post: adminBlogDTO(post) });
    }),
    detail: respond(async (req, res) => {
      if (!validBlogId(req.params.id)) throw blogFailure(404, "Blog post not found.");
      const post = await Model.findOne({ _id: req.params.id, ...published() }).lean();
      if (!post) throw blogFailure(404, "Blog post not found.");
      res.json({ success: true, post: publicBlogDTO(post, true) });
    }),
    create: respond(async (req, res) => {
      const data = validateBlogInput(req.body);
      const bytes = await processCover(req.file);
      const post = new Model({ ...data, createdBy: req.user._id, publishedAt: data.status === "published" ? now() : null });
      const asset = {}; let writeAttempted = false;
      try {
        post.coverImage = await storage.upload(bytes, asset);
        await post.validate();
        writeAttempted = true;
        await post.save();
      } catch (error) {
        // Network/write timeouts may have committed: retain the cover unless
        // failure definitely preceded persistence or DB rejected the document.
        if (!writeAttempted || ["ValidationError", "CastError", "StrictModeError"].includes(error.name) || error.code === 11000) await storage.cleanup(asset);
        throw error;
      }
      res.status(201).json({ success: true, post: adminBlogDTO(post) });
    }),
    update: respond(async (req, res) => {
      if (!validBlogId(req.params.id)) throw blogFailure(404, "Blog post not found.");
      const { data, revision } = validateBlogUpdate(req.body);
      const existing = await Model.findOne({ _id: req.params.id }).lean();
      if (!existing) throw blogFailure(404, "Blog post not found.");
      if ((existing.revision ?? 0) !== revision) throw blogFailure(409, "This post changed. Reload the saved post before editing again.");
      const candidate = new Model({ ...existing, ...data });
      await candidate.validate();
      const bytes = req.file ? await processCover(req.file) : null;
      const asset = {}; let writeAttempted = false;
      try {
        if (bytes) { data.coverImage = await storage.upload(bytes, asset); candidate.coverImage = data.coverImage; await candidate.validate(); }
        // Legacy documents with no revision are revision zero. Both edits and
        // publication increment it; never include status/identity/dates in $set.
        const version = revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };
        writeAttempted = true;
        const saved = await Model.findOneAndUpdate({ _id: req.params.id, ...version }, { $set: data, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean();
        if (!saved) throw Object.assign(blogFailure(409, "This post changed. Reload the saved post before editing again."), { definiteBlogFailure: true });
        res.json({ success: true, post: adminBlogDTO(saved) });
      } catch (error) {
        if (asset.public_id && (!writeAttempted || error.definiteBlogFailure || ["ValidationError", "CastError", "StrictModeError"].includes(error.name) || error.code === 11000)) await storage.cleanup(asset);
        throw error;
      }
      // Retain the previous cover: another reader may still reference it.
      // Never destroy an existing cover or a cover from an uncertain DB write.
    }),
    publish: respond(async (req, res) => {
      if (!validBlogId(req.params.id)) throw blogFailure(404, "Blog post not found.");
      if (req.body != null && (typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length)) throw blogFailure(400, "Publication accepts no fields; publication date is assigned by the server.");
      // Atomic draft-only transition preserves the original publication date
      // on repeated or concurrent publication requests.
      let post = await Model.findOneAndUpdate({ _id: req.params.id, status: "draft" }, { $set: { status: "published", publishedAt: now() }, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean();
      if (!post) post = await Model.findOne({ _id: req.params.id, status: "published" }).lean();
      if (!post) throw blogFailure(404, "Blog post not found.");
      res.json({ success: true, post: adminBlogDTO(post) });
    }),
  };
}
export const blogController = createBlogController();
