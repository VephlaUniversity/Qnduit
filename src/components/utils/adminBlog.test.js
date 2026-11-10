import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminBlogClient, blogFormData, validateBlogDraft, blogEditDraft } from "./adminBlog.js";

const id = "111111111111111111111111", postId = "222222222222222222222222";
const cover = () => new File(["synthetic"], "cover.png", { type: "image/png" });
const draft = () => ({ title: "Synthetic article", excerpt: "Synthetic excerpt", category: "Testing", author: "Synthetic Admin", status: "draft", content: [{ type: "paragraph", text: "Synthetic text" }] });
const post = (extra = {}) => ({ ...draft(), id: postId, revision: 0, image: "https://res.cloudinary.com/test/image/upload/cover.png", createdBy: id, createdAt: "2026-11-09T10:00:00Z", publishedAt: null, ...extra });
const list = (rows = []) => ({ success: true, data: rows, pagination: { page: 1, limit: 10, total: rows.length, totalPages: 1 } });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture(request = async () => ({ data: list() }), sharedStorage) {
  let owner = { actor: `admin:${id}`, token: "synthetic-admin-token" };
  const calls = [], storage = sharedStorage || new Map();
  const store = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const client = createAdminBlogClient({ client: { request: options => { calls.push(options); return request(options); } }, baseUrl: "http://127.0.0.1:5193", readOwner: () => owner, storage: store });
  return { client, calls, storage, owner: value => { owner = value; } };
}
test("blog form validates exact required fields, lengths and plain structured content", () => {
  assert.deepEqual(validateBlogDraft(draft(), cover()).errors, {});
  for (const field of ["title", "excerpt", "category", "author"]) {
    assert(validateBlogDraft({ ...draft(), [field]: " " }, cover()).errors[field]);
    assert(validateBlogDraft({ ...draft(), [field]: "x".repeat(10001) }, cover()).errors[field]);
  }
  for (const content of [[], [{ type: "paragraph", text: "<script>bad</script>" }], [{ type: "image", src: "javascript:bad" }], [{ type: "paragraph", text: " " }]]) assert(validateBlogDraft({ ...draft(), content }, cover()).errors.content);
  assert(validateBlogDraft({ ...draft(), status: "closed" }, cover()).errors.status);
});
test("cover validation rejects missing, empty, oversized and mismatched files", () => {
  for (const image of [null, new File([], "empty.png", { type: "image/png" }), new File(["fake"], "cover.svg", { type: "image/png" }), { size: 10 * 1024 * 1024 + 1, name: "large.png", type: "image/png" }, new File(["fake"], "cover.png", { type: "application/pdf" })]) assert(validateBlogDraft(draft(), image).errors.coverImage);
});
test("multipart includes only exact backend field names and structured JSON", () => {
  const data = blogFormData(draft(), cover());
  assert.deepEqual([...data.keys()], ["title", "excerpt", "category", "author", "status", "content", "coverImage"]);
  assert.deepEqual(JSON.parse(data.get("content")), draft().content); assert.equal(data.get("coverImage").name, "cover.png");
});
test("admin listing uses pagination, Bearer session and bounded safety interceptors", async () => {
  const f = fixture(); await f.client.list();
  assert.equal(f.calls[0].url, "http://127.0.0.1:5193/api/admin/blog");
  assert.deepEqual(f.calls[0].params, { page: 1, limit: 10 }); assert.equal(f.calls[0].headers.Authorization, "Bearer synthetic-admin-token"); assert.equal(f.calls[0].qnduitBoundedRead, true);
});
test("draft and published creation require confirmed matching responses", async () => {
  for (const status of ["draft", "published"]) {
    const f = fixture(async () => ({ data: { success: true, post: post({ status }) } }));
    assert.equal((await f.client.create(blogFormData({ ...draft(), status }, cover()))).post.status, status); assert.equal(f.client.hasUncertain(), false);
  }
});
test("same-tick creation/publication clicks share one mutation lock", async () => {
  const wait = deferred(), f = fixture(() => wait.promise);
  const first = f.client.create(blogFormData(draft(), cover()));
  await assert.rejects(f.client.create(blogFormData(draft(), cover())), /pending/);
  await assert.rejects(f.client.publish(postId), /pending/); assert.equal(f.calls.length, 1);
  wait.resolve({ data: { success: true, post: post() } }); await first;
});
test("publication uses empty PATCH and verifies ID/status", async () => {
  const f = fixture(async () => ({ data: { success: true, post: post({ status: "published" }) } }));
  await f.client.publish(postId); assert.equal(f.calls[0].method, "PATCH"); assert.deepEqual(f.calls[0].data, {}); assert(f.calls[0].url.endsWith(`/${postId}/publish`));
  const invalid = fixture(async () => ({ data: { success: true, post: post() } })); await assert.rejects(invalid.client.publish(postId), /confirmed/);
});
test("anonymous and non-admin callers never send requests", async () => {
  for (const owner of [null, { actor: `talent:${id}`, token: "talent" }]) { const f = fixture(); f.owner(owner); await assert.rejects(f.client.list(), /Admin/); assert.equal(f.calls.length, 0); }
});
test("session changes and cancellation discard late results", async () => {
  for (const action of [f => f.owner({ actor: `admin:${id}`, token: "different" }), f => f.client.cancel()]) {
    const wait = deferred(), f = fixture(() => wait.promise), loading = f.client.list(); action(f); wait.resolve({ data: list([post()]) }); assert.equal(await loading, undefined); assert.equal(f.calls.length, 1);
  }
});
test("uncertain creation is durable and cannot retry until explicit refreshed-list review", async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw new Error("Synthetic network failure"); return { data: list([post()]) }; });
  await assert.rejects(f.client.create(blogFormData(draft(), cover())), error => error.uncertain === true);
  await assert.rejects(f.client.create(blogFormData(draft(), cover())), /may have been saved/); assert.equal(f.calls.length, 1);
  const remount = fixture(async () => ({ data: list() }), f.storage); assert.equal(remount.client.hasUncertain(), true);
  assert.throws(() => f.client.acknowledgeReview(), /Refresh/); fail = false; await f.client.list(); f.client.acknowledgeReview(); assert.equal(f.client.hasUncertain(), false);
});
test("explicit validation rejection allows correction but 503 or malformed success locks creation", async () => {
  for (const status of [400, 401, 403, 413, 429]) {
    const f = fixture(async () => { throw Object.assign(Error("Synthetic rejection"), { response: { status } }); });
    await assert.rejects(f.client.create(blogFormData(draft(), cover()))); assert.equal(f.client.hasUncertain(), false);
  }
  for (const response of [null, { success: true, post: post({ title: "Wrong post" }) }]) {
    const f = fixture(async () => { if (!response) throw Object.assign(Error("Uncertain"), { response: { status: 503 } }); return { data: response }; });
    await assert.rejects(f.client.create(blogFormData(draft(), cover())), error => error.uncertain); assert.equal(f.client.hasUncertain(), true);
  }
});
test("commit-then-502 creation retains its durable lock until explicit list review without replay", async () => {
  let writes = 0;
  const f = fixture(async options => {
    if (options.method === "POST") { writes++; throw Object.assign(Error("Lost gateway acknowledgement"), { response: { status: 502, data: "Bad Gateway" } }); }
    return { data: list([post()]) };
  });
  await assert.rejects(f.client.create(blogFormData(draft(), cover())), error => error.uncertain);
  assert(f.client.hasUncertain()); await assert.rejects(f.client.create(blogFormData(draft(), cover())), error => error.uncertain); assert.equal(writes, 1);
  const remount = fixture(async () => ({ data: list([post()]) }), f.storage); assert(remount.client.hasUncertain());
  await f.client.list(); assert(f.client.hasUncertain()); assert.equal(writes, 1); f.client.acknowledgeReview(); assert.equal(f.client.hasUncertain(), false);
});
test("commit-then-502 edit requires explicit saved-record reload and never replays the edit", async () => {
  let writes = 0;
  const f = fixture(async options => {
    if (options.method === "PATCH") { writes++; throw Object.assign(Error("Lost gateway acknowledgement"), { response: { status: 502, data: { message: "Synthetic provider failure" } } }); }
    return { data: { success: true, post: post({ revision: 1, title: "Saved edit" }) } };
  });
  await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), error => error.uncertainUpdate); assert(f.client.hasUncertainUpdate(postId));
  await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), error => error.uncertainUpdate); assert.equal(writes, 1);
  await f.client.details(postId); assert(f.client.hasUncertainUpdate(postId));
  assert.equal((await f.client.reviewUpdate(postId)).post.title, "Saved edit"); assert.equal(f.client.hasUncertainUpdate(postId), false); assert.equal(writes, 1);
});
test("all ambiguous 5xx and network losses preserve creation/edit locks", async () => {
  for (const status of [500, 502, 503, 504, undefined]) {
    const reject = async () => { throw Object.assign(Error("Synthetic lost acknowledgement"), status ? { response: { status } } : {}); };
    const f = fixture(reject); await assert.rejects(f.client.create(blogFormData(draft(), cover())), error => error.uncertain); assert(f.client.hasUncertain());
    const edit = fixture(reject); await assert.rejects(edit.client.update(post(), blogFormData(draft(), null, post())), error => error.uncertainUpdate); assert(edit.client.hasUncertainUpdate(postId));
  }
});
test("a list started before creation failure cannot unlock an uncertain creation", async () => {
  const wait = deferred(), f = fixture(options => options.method === "GET" ? wait.promise : Promise.reject(Error("Uncertain")));
  const listing = f.client.list(); await assert.rejects(f.client.create(blogFormData(draft(), cover()))); wait.resolve({ data: list() }); await listing;
  assert.equal(f.client.reviewReady(), false); assert.throws(() => f.client.acknowledgeReview(), /Refresh/);
});
test("existing post fills the same form with independent structured values", () => {
  const saved = post({ status: "published", content: [{ type: "heading", text: "Heading" }, { type: "image", src: "https://res.cloudinary.com/test/image/upload/body.png" }] });
  const loaded = blogEditDraft(saved); assert.deepEqual(loaded, { title: saved.title, excerpt: saved.excerpt, category: saved.category, author: saved.author, status: "published", content: saved.content });
  loaded.content[0].text = "Changed"; assert.equal(saved.content[0].text, "Heading"); assert.equal(Object.hasOwn(loaded, "createdBy"), false);
});
test("edit validation permits retained cover but validates every selected replacement", () => {
  assert.deepEqual(validateBlogDraft(draft(), null, { editing: true }).errors, {});
  assert(validateBlogDraft(draft(), new File(["bad"], "bad.svg", { type: "image/svg+xml" }), { editing: true }).errors.coverImage);
  assert(validateBlogDraft({ ...draft(), content: [{ type: "image", src: "javascript:bad" }] }, null, { editing: true }).errors.content);
});
test("edit multipart excludes identity/status/dates and includes revision plus optional cover", () => {
  const body = blogFormData(draft(), null, post());
  assert.deepEqual([...body.keys()], ["title", "excerpt", "category", "author", "revision", "content"]); assert.equal(body.get("revision"), "0");
  assert.equal(blogFormData(draft(), cover(), post()).get("coverImage").name, "cover.png");
});
test("fresh admin detail loads draft/published post and rejects wrong identity", async () => {
  for (const status of ["draft", "published"]) {
    const f = fixture(async () => ({ data: { success: true, post: post({ status }) } })); assert.equal((await f.client.details(postId)).post.status, status); assert.equal(f.calls[0].url, `http://127.0.0.1:5193/api/admin/blog/${postId}`);
  }
  const f = fixture(async () => ({ data: { success: true, post: post({ id: "333333333333333333333333" }) } })); await assert.rejects(f.client.details(postId), /confirmed/);
});
test("edit submission confirms fields, revision, identity and publication metadata", async () => {
  for (const status of ["draft", "published"]) {
    const saved = post({ status, publishedAt: status === "published" ? "2026-11-01T00:00:00Z" : null });
    const f = fixture(async () => ({ data: { success: true, post: { ...saved, title: "Edited", revision: 1 } } }));
    assert.equal((await f.client.update(saved, blogFormData({ ...draft(), title: "Edited" }, null, saved))).post.title, "Edited"); assert.equal(f.calls[0].method, "PATCH"); assert.equal(f.client.hasUncertainUpdate(postId), false);
  }
});
test("edit shares the duplicate-write lock and discards stale session feedback", async () => {
  const wait = deferred(), f = fixture(() => wait.promise), saved = post();
  const first = f.client.update(saved, blogFormData(draft(), null, saved));
  await assert.rejects(f.client.update(saved, blogFormData(draft(), null, saved)), /pending/); await assert.rejects(f.client.create(blogFormData(draft(), cover())), /pending/);
  f.owner({ actor: `admin:${id}`, token: "changed" }); wait.resolve({ data: { success: true, post: post({ revision: 1 }) } }); assert.equal(await first, undefined); assert.equal(f.calls.length, 1);
});
test("edit rejection preserves correction; uncertain edit persists until explicit reload", async () => {
  let mode = "validation";
  const f = fixture(async () => {
    if (mode === "validation") throw Object.assign(Error("Invalid title"), { response: { status: 400, data: { errors: { title: "Enter a title." } } } });
    if (mode === "uncertain") throw Error("Lost acknowledgement");
    return { data: { success: true, post: post({ title: "Saved edit", revision: 1 }) } };
  });
  await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), error => error.response.data.errors.title === "Enter a title."); assert.equal(f.client.hasUncertainUpdate(postId), false);
  mode = "uncertain"; await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), error => error.uncertainUpdate); assert.equal(f.client.hasUncertainUpdate(postId), true);
  await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), /Reload/); assert.equal(f.calls.length, 2);
  const remount = fixture(async () => ({ data: { success: true, post: post({ revision: 1 }) } }), f.storage); assert.equal(remount.client.hasUncertainUpdate(postId), true);
  mode = "read"; assert.equal((await f.client.reviewUpdate(postId)).post.title, "Saved edit"); assert.equal(f.client.hasUncertainUpdate(postId), false);
});
test("edit response cannot silently change status/creator/date or return mismatched content", async () => {
  for (const extra of [{ status: "published" }, { createdBy: "333333333333333333333333" }, { publishedAt: "2026-11-09T10:00:00Z" }, { revision: 0 }, { content: [{ type: "paragraph", text: "Wrong text" }] }]) {
    const f = fixture(async () => ({ data: { success: true, post: post({ revision: 1, ...extra }) } })); await assert.rejects(f.client.update(post(), blogFormData(draft(), null, post())), error => error.uncertainUpdate); assert(f.client.hasUncertainUpdate(postId));
  }
});
