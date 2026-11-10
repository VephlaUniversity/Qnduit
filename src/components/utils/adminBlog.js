import { validateBlogInput, validBlogId, blogImageUrl } from "../../../backend/src/utils/blogValidation.js";
import { friendlyError } from "./userMessage.js";
import { validateFile } from "./formValidation.js";

export function validateBlogDraft(draft, cover, { editing = false } = {}) {
  let data;
  const errors = {};
  try { data = validateBlogInput(draft); }
  catch (error) { Object.assign(errors, error.errors || { content: error.message }); }
  if (cover || !editing) {
    const checked = validateFile(cover, { maxSize: 10 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png"] });
    if (!checked.valid) errors.coverImage = checked.error;
    else if (!cover.size || !(cover.type === "image/png" ? /\.png$/i.test(cover.name) : /\.jpe?g$/i.test(cover.name))) errors.coverImage = "Choose a non-empty JPEG or PNG cover with a matching filename.";
  }
  return { data, errors };
}
export function blogFormData(data, cover, target) {
  const body = new FormData();
  for (const key of ["title", "excerpt", "category", "author", ...(target ? [] : ["status"])]) body.append(key, data[key]);
  if (target) body.append("revision", String(target.revision));
  body.append("content", JSON.stringify(data.content));
  if (cover) body.append("coverImage", cover);
  return body;
}
export const blogPageAfterRefresh = (page, pagination) => Math.min(page, pagination.totalPages);

export function blogEditDraft(post) {
  return { ...Object.fromEntries(["title", "excerpt", "category", "author", "status"].map(key => [key, post[key]])), content: post.content.map(block => block.type === "image" ? { type: block.type, src: block.src } : { type: block.type, text: block.text }) };
}
const validPost = post => validBlogId(post?.id) && ["draft", "published"].includes(post.status)
  && ["title", "excerpt", "category", "author"].every(key => typeof post[key] === "string") && blogImageUrl(post.image) && Array.isArray(post.content) && Number.isSafeInteger(post.revision) && post.revision >= 0;
const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";
const uncertainMessage = "This post may have been saved. Refresh and review the posts before starting another creation. Do not submit it again.";
const uncertainEditMessage = "This edit may have been saved. Reload the saved post before editing again. Do not submit this form again.";

// Uses the same owner/cancellation pattern as adminJobs, with a separate
// creation lock because the blog API has no idempotency key.
export function createAdminBlogClient({ client, baseUrl, readOwner, storage }) {
  const slots = new Map();
  let reviewed = false, reviewVersion = 0;
  const memory = new Set();
  const receiptKey = () => `qnduit:blog-creation-review:${readOwner()?.actor || "none"}`;
  const editReceiptKey = id => `qnduit:blog-edit-review:${readOwner()?.actor || "none"}:${id}`;
  const hasUncertainUpdate = id => { const key = editReceiptKey(id); try { return memory.has(key) || storage?.getItem(key) === "pending"; } catch { return memory.has(key); } };
  const hasUncertain = () => { try { return memory.has(receiptKey()) || storage?.getItem(receiptKey()) === "pending"; } catch { return memory.has(receiptKey()); } };
  const receipt = (key, pending) => { if (pending) memory.add(key); else memory.delete(key); try { if (pending) storage?.setItem(key, "pending"); else storage?.removeItem(key); } catch { /* In-memory lock remains active. */ } };
  async function run(slot, method, path, body, params, expected) {
    if (slot === "write" && slots.has(slot)) throw new Error("A blog operation is already pending.");
    const owner = readOwner(), key = ownerKey(owner);
    if (!owner?.actor?.startsWith("admin:") || !owner.token) throw new Error("Sign in with an Admin account.");
    const creating = method === "POST";
    const updating = method === "PATCH" && !path.endsWith("/publish");
    const deleting = method === "DELETE";
    const publishing = method === "PATCH" && !updating;
    if (creating && hasUncertain()) throw Object.assign(new Error(uncertainMessage), { uncertain: true });
    if (updating && hasUncertainUpdate(expected.id)) throw Object.assign(new Error(uncertainEditMessage), { uncertainUpdate: true });
    slots.get(slot)?.abort();
    const controller = new AbortController(); slots.set(slot, controller);
    const current = () => slots.get(slot) === controller && !controller.signal.aborted && key === ownerKey(readOwner());
    const pendingKey = receiptKey();
    const editPendingKey = updating ? editReceiptKey(expected.id) : null;
    if (updating) receipt(editPendingKey, true);
    if (creating) { receipt(pendingKey, true); reviewed = false; reviewVersion++; }
    const listVersion = reviewVersion;
    try {
      const response = await client.request({ method, url: `${baseUrl}/api/admin/blog${path}`, data: body, params,
        headers: { Authorization: `Bearer ${owner.token}`, ...(deleting ? { "Content-Type": "application/json" } : {}) }, signal: controller.signal, timeout: creating || updating ? 60000 : 15000, qnduitBoundedRead: true });
      const data = response.data;
      const pagination = data?.pagination;
      const valid = slot === "list" ? Array.isArray(data?.data) && data.data.every(validPost)
        && Number.isSafeInteger(pagination?.page) && pagination.page === params.page && Number.isSafeInteger(pagination.totalPages) && pagination.totalPages >= 1
        && Number.isSafeInteger(pagination.total) && pagination.total >= 0
        : deleting ? response.status === 200 && data?.id === expected.id
        : validPost(data?.post) && (!expected || data.post.id === (updating ? expected.id : expected))
          && (!publishing || data.post.status === "published")
          && (!updating || data.post.status === expected.status && data.post.createdBy === expected.createdBy && (data.post.publishedAt ?? null) === (expected.publishedAt ?? null) && data.post.revision === expected.revision + 1
            && ["title", "excerpt", "category", "author"].every(key => data.post[key] === body.get(key)) && JSON.stringify(data.post.content) === body.get("content"))
          && (!creating || data.post.status === body.get("status") && data.post.title === body.get("title") && data.post.author === body.get("author") && data.post.createdBy === owner.actor.slice("admin:".length));
      if (data?.success !== true || !valid) throw new Error("The blog operation could not be confirmed.");
      if (creating) receipt(pendingKey, false);
      if (updating) receipt(editPendingKey, false);
      if (!current()) return;
      if (slot === "list" && hasUncertain() && listVersion === reviewVersion) reviewed = true;
      return data;
    } catch (error) {
      // Explicit rejection is safe to correct. Network/5xx/invalid success
      // responses can hide a committed creation, so keep the durable lock.
      // No current error contract proves a 5xx occurred before persistence.
      // In particular, a proxy 502 can hide a committed creation or edit.
      const definite = [400, 401, 403, 404, 409, 413, 429].includes(error.response?.status);
      if (creating && definite) receipt(pendingKey, false);
      if (creating && !definite) { reviewed = false; reviewVersion++; }
      if (updating && definite) receipt(editPendingKey, false);
      if (!current()) return;
      if (creating && !definite) throw Object.assign(new Error(uncertainMessage), { uncertain: true });
      if (deleting && !definite) throw Object.assign(new Error("Deletion could not be confirmed. Refresh this post before confirming again."), { uncertainDelete: true });
      if (updating && !definite) throw Object.assign(new Error(uncertainEditMessage), { uncertainUpdate: true });
      throw error;
    } finally { if (slots.get(slot) === controller) slots.delete(slot); }
  }
  return {
    cancel() { for (const controller of slots.values()) controller.abort(); slots.clear(); },
    hasUncertain,
    hasUncertainUpdate,
    reviewReady: () => reviewed,
    acknowledgeReview() { if (!reviewed) throw new Error("Refresh the posts before confirming review."); receipt(receiptKey(), false); reviewed = false; },
    list: (page = 1) => run("list", "GET", "", undefined, { page, limit: 10 }),
    create: body => run("write", "POST", "", body),
    details(id) { if (!validBlogId(id)) throw new Error("Select a saved blog post."); return run("details", "GET", `/${id}`, undefined, undefined, id); },
    async reviewUpdate(id) {
      const data = await this.details(id);
      if (data) receipt(editReceiptKey(id), false);
      return data;
    },
    update(target, body) { if (!validPost(target)) throw new Error("Reload a saved blog post before editing."); return run("write", "PATCH", `/${target.id}`, body, undefined, target); },
    remove(target) { if (!validPost(target)) throw new Error("Reload a saved blog post before deleting."); return run("write", "DELETE", `/${target.id}`, { revision: target.revision }, undefined, target); },
    publish(id) { if (!validBlogId(id)) throw new Error("Select a saved blog post."); return run("write", "PATCH", `/${id}/publish`, {}, undefined, id); },
  };
}

// Confirmation owns a fresh detail snapshot; every conflict/uncertain write
// invalidates it. Refresh only reads and always requires another confirmation.
export function createBlogDeletion({ client, readOwner, onChange, onDeleted, onMissing }) {
  let state = { subject: null, status: "idle", message: "" }, generation = 0, owner;
  const emit = changes => { state = { ...state, ...changes }; onChange(state); };
  const current = version => generation === version && owner === ownerKey(readOwner());
  const flow = {
    snapshot: () => state,
    cancel() { generation++; state = { subject: null, status: "idle", message: "" }; onChange(state); },
    close() { if (!["sending", "loading"].includes(state.status)) flow.cancel(); },
    async open(post, trigger) {
      if (["sending", "loading"].includes(state.status)) return;
      owner = ownerKey(readOwner());
      const version = ++generation;
      emit({ subject: { id: post.id, trigger }, status: "loading", message: "Loading saved post…" });
      try {
        const data = await client.details(post.id);
        if (!current(version) || !data) return;
        emit({ subject: { ...data.post, trigger }, status: "ready", message: "" });
      } catch (error) {
        if (!current(version)) return;
        if (error.response?.status === 404) { emit({ status: "missing", message: "This post is no longer available." }); onMissing(); }
        else emit({ status: "blocked", message: friendlyError(error, "Unable to load this post. Refresh before continuing.") });
      }
    },
    refresh() { return flow.open(state.subject, state.subject?.trigger); },
    async confirm() {
      if (state.status !== "ready" || owner !== ownerKey(readOwner())) return;
      const version = generation, subject = state.subject;
      emit({ status: "sending", message: "Deleting post…" });
      try {
        const data = await client.remove(subject);
        if (!current(version) || !data) return;
        flow.cancel(); onDeleted(data.id);
      } catch (error) {
        if (!current(version)) return;
        const status = error.response?.status;
        if (status === 404) { emit({ status: "missing", message: "This post is no longer available." }); onMissing(); }
        else if (status === 409) {
          emit({ status: "blocked", message: "This post changed. Refresh its details and confirm again." });
        } else emit({ status: "blocked", message: error.uncertainDelete ? error.message : friendlyError(error, "Deletion failed. Refresh this post before confirming again.") });
      }
    },
  };
  return flow;
}
