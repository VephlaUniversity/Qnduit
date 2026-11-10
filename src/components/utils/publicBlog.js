import { blogPosts } from "../data/blogPosts.js";
import { BLOG_LIMITS, validBlogId, blogImageUrl, validateBlogContent } from "../../../backend/src/utils/blogValidation.js";
import { friendlyError } from "./userMessage.js";

export const PUBLIC_BLOG_PAGE_SIZE = 6;
export const staticBlogPost = id => blogPosts.find(post => post.id === id);
const malformed = () => new Error("The article response could not be confirmed.");
export function mapPublicBlogPost(row, detail = false) {
  if (!row || !validBlogId(row.id) || (row.status !== undefined && row.status !== "published") || !blogImageUrl(row.image)
    || typeof row.publishedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(row.publishedAt) || !Number.isFinite(new Date(row.publishedAt).getTime())) throw malformed();
  const fields = {};
  for (const key of ["title", "excerpt", "category", "author"]) {
    const value = row[key];
    if (typeof value !== "string" || !value.trim() || value.length > BLOG_LIMITS[key] || /[<>]/.test(value)) throw malformed();
    fields[key] = value.trim();
  }
  let content;
  if (detail) {
    content = validateBlogContent(row.content);
  }
  // Deliberate public projection: ignore admin/storage/account fields even if a
  // malformed upstream response includes them. No credentials are needed here.
  return { id: row.id.toLowerCase(), ...fields, image: row.image, publishedAt: row.publishedAt,
    date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(row.publishedAt)),
    ...(detail ? { content } : {}) };
}
export function mapPublicBlogPage(body, page) {
  const pagination = body?.pagination;
  if (body?.success !== true || !Array.isArray(body.data) || body.data.length > PUBLIC_BLOG_PAGE_SIZE
    || pagination?.page !== page || pagination.limit !== PUBLIC_BLOG_PAGE_SIZE || !Number.isSafeInteger(pagination.total) || pagination.total < body.data.length
    || pagination.totalPages !== Math.max(1, Math.ceil(pagination.total / PUBLIC_BLOG_PAGE_SIZE))) throw malformed();
  const posts = body.data.map(row => mapPublicBlogPost(row));
  if (new Set(posts.map(post => post.id)).size !== posts.length) throw malformed();
  return { posts, nextPage: page + 1, hasMore: page < pagination.totalPages && page < 10000 };
}
export function combinedBlogPosts(dynamic, legacy = blogPosts) {
  const reserved = new Set(legacy.map(post => post.id));
  const unique = new Map();
  for (const post of dynamic) if (validBlogId(post.id) && !reserved.has(post.id)) unique.set(post.id, post);
  return [...legacy.slice(0, 1), ...unique.values(), ...legacy.slice(1)];
}
const publicRequest = (client, baseUrl, path, controller, params) => client.request({
  method: "GET", url: `${baseUrl}/api/blog${path}`, params, signal: controller.signal, timeout: 15000,
  headers: { Authorization: undefined }, withCredentials: false, qnduitBoundedRead: true,
});

// Public pagination/validation is separate from the admin mutation/session client.
// Each instance owns cancellation and never retries or advances a failed page.
export function createPublicBlogFeed({ client, baseUrl, onChange = () => {} }) {
  let state = { posts: [], nextPage: 1, hasMore: true, status: "idle", error: "" }, active;
  const emit = changes => { state = { ...state, ...changes }; onChange(state); };
  return {
    snapshot: () => state,
    cancel() { active?.abort(); active = null; },
    async loadNext() {
      if (active || !state.hasMore) return;
      const controller = new AbortController(); active = controller;
      const current = () => active === controller && !controller.signal.aborted;
      const page = state.nextPage;
      emit({ status: "loading", error: "" });
      try {
        const response = await publicRequest(client, baseUrl, "", controller, { page, limit: PUBLIC_BLOG_PAGE_SIZE });
        if (!current()) return;
        const mapped = mapPublicBlogPage(response.data, page), unique = new Map(state.posts.map(post => [post.id, post]));
        for (const post of mapped.posts) unique.set(post.id, post);
        emit({ ...mapped, posts: [...unique.values()], status: "ready", error: "" });
        return state;
      } catch (error) {
        if (current()) emit({ status: "error", error: friendlyError(error, "We couldn't load new articles. Please try again.") });
      } finally { if (active === controller) active = null; }
    },
  };
}
export function createPublicBlogReader({ client, baseUrl, onChange = () => {} }) {
  let active;
  return {
    cancel() { active?.abort(); active = null; },
    async load(id) {
      active?.abort(); active = null;
      const legacy = staticBlogPost(id);
      if (legacy) { const result = { id, status: "ready", post: legacy }; onChange(result); return result; }
      if (!validBlogId(id)) { const result = { id, status: "invalid", post: null }; onChange(result); return result; }
      const controller = new AbortController(); active = controller;
      const current = () => active === controller && !controller.signal.aborted;
      onChange({ id, status: "loading", post: null });
      try {
        const response = await publicRequest(client, baseUrl, `/${encodeURIComponent(id)}`, controller);
        if (!current()) return;
        if (response.data?.success !== true) throw malformed();
        const post = mapPublicBlogPost(response.data.post, true);
        if (post.id !== id.toLowerCase()) throw malformed();
        const result = { id, status: "ready", post }; onChange(result); return result;
      } catch (error) {
        if (current()) { const result = { id, status: error.response?.status === 404 ? "missing" : "error", post: null,
          error: friendlyError(error, "We couldn't load this article. Please try again.") }; onChange(result); return result; }
      } finally { if (active === controller) active = null; }
    },
  };
}
