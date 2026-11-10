export const BLOG_LIMITS = Object.freeze({ title: 200, excerpt: 500, category: 80, author: 120, blocks: 200, blockText: 10000, content: 100000 });
export const blogFailure = (status, message, errors) => Object.assign(new Error(message), { status, errors });
const plain = value => typeof value === "string" && !/[<>]/.test(value) && !Array.from(value).some(character => character.charCodeAt(0) < 32 && ![9, 10, 13].includes(character.charCodeAt(0)));
export function blogImageUrl(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\s<>\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    // Only public image delivery is publishable. Query/fragment credentials and
    // private/authenticated/raw/fetch delivery must never cross a public boundary.
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.port && !url.username && !url.password
      && /^\/[^/]+\/image\/upload\/.+/.test(url.pathname) && !value.includes("?") && !value.includes("#");
  } catch { return false; }
}
export function validateBlogContent(content) {
  if (!Array.isArray(content) || !content.length || content.length > BLOG_LIMITS.blocks) throw blogFailure(400, "Provide 1–200 article blocks.", { content: "Provide supported article blocks." });
  let total = 0, hasText = false;
  const result = content.map(block => {
    if (!block || typeof block !== "object" || Array.isArray(block) || !["paragraph", "heading", "quote", "image"].includes(block.type)) throw blogFailure(400, "Unsupported article block.");
    const field = block.type === "image" ? "src" : "text";
    if (Object.keys(block).some(key => !["type", field].includes(key))) throw blogFailure(400, "Unsupported article block fields.");
    const value = block[field];
    if (field === "src" ? !blogImageUrl(value) : !plain(value) || !value.trim() || value.length > BLOG_LIMITS.blockText) throw blogFailure(400, "Invalid article block content.");
    total += value.length;
    if (field === "text") hasText = true;
    return { type: block.type, [field]: value.trim() };
  });
  if (!hasText || total > BLOG_LIMITS.content) throw blogFailure(400, "Article requires text and must be at most 100000 characters.");
  return result;
}
export function validateBlogInput(body) {
  const allowed = ["title", "excerpt", "category", "author", "content", "status"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw blogFailure(400, "Use only supported blog fields. Creator and publication dates are assigned by the server.");
  const data = {}, errors = {};
  for (const field of ["title", "excerpt", "category", "author"]) {
    const value = body[field];
    if (!plain(value) || !value.trim() || value.length > BLOG_LIMITS[field]) errors[field] = `Enter plain text, 1–${BLOG_LIMITS[field]} characters.`;
    else data[field] = value.trim();
  }
  data.status = body.status === undefined ? "draft" : body.status;
  if (!["draft", "published"].includes(data.status)) errors.status = "Choose draft or published.";
  if (Object.keys(errors).length) throw blogFailure(400, "Please check the blog details.", errors);
  let content = body.content;
  if (typeof content === "string") {
    try { content = JSON.parse(content); } catch { throw blogFailure(400, "Article content must be a JSON block array."); }
  }
  data.content = validateBlogContent(content);
  return data;
}
export function blogPagination(query = {}) {
  if (Object.keys(query).some(key => !["page", "limit"].includes(key))) throw blogFailure(400, "Use page and limit only.");
  const read = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max) throw blogFailure(400, "Invalid blog pagination.");
    return Number(value);
  };
  return { page: read(query.page, 1, 10000), limit: read(query.limit, 10, 50) };
}
export function validateBlogUpdate(body) {
  const fields = ["title", "excerpt", "category", "author", "content"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => ![...fields, "revision"].includes(key))) throw blogFailure(400, "Edits accept article fields and revision only. Identity, status and dates cannot be edited.");
  const revision = typeof body.revision === "string" && /^(0|[1-9]\d*)$/.test(body.revision) ? Number(body.revision) : body.revision;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision === Number.MAX_SAFE_INTEGER) throw blogFailure(400, "A saved blog revision is required. Reload the post before editing.");
  const data = validateBlogInput(Object.fromEntries(fields.map(key => [key, body[key]])));
  delete data.status;
  return { data, revision };
}
export function validateBlogDelete(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "revision")
    || !Number.isSafeInteger(body.revision) || body.revision < 0) throw blogFailure(400, "Deletion requires only a saved blog revision as a non-negative integer.");
  return body.revision;
}
export const validBlogId = value => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
function blogDTO(post, detail = false) {
  return { id: String(post._id), title: post.title, excerpt: post.excerpt, category: post.category,
    image: post.coverImage.url, author: post.author, publishedAt: post.publishedAt,
    ...(detail ? { content: post.content.map(block => block.type === "image" ? { type: block.type, src: block.src } : { type: block.type, text: block.text }) } : {}) };
}
export function publicBlogDTO(post, detail = false) {
  try {
    if (!blogImageUrl(post.coverImage?.url)) throw new Error("Invalid public cover");
    // Check stored content even for list responses: legacy records did not use
    // today's URL policy. Reject the response before serializing any record.
    validateBlogContent(post.content.map(block => typeof block.toObject === "function" ? block.toObject() : block));
  } catch {
    throw blogFailure(503, "This article is temporarily unavailable.");
  }
  return blogDTO(post, detail);
}
// Authorized admins can still load legacy content to replace an unsafe URL.
// Public projection is deliberately guarded separately from this repair view.
export const adminBlogDTO = post => ({ ...blogDTO(post, true), status: post.status, revision: post.revision ?? 0, createdBy: String(post.createdBy), createdAt: post.createdAt, updatedAt: post.updatedAt });
