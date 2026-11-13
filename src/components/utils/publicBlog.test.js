import assert from "node:assert/strict";
import { test } from "node:test";
import { blogPosts } from "../data/blogPosts.js";
import { mapPublicBlogPost, mapPublicBlogPage, combinedBlogPosts, staticBlogPost, createPublicBlogFeed, createPublicBlogReader } from "./publicBlog.js";
import { blogImageUrl } from "../../../backend/src/utils/blogValidation.js";

const id = "111111111111111111111111", secondId = "222222222222222222222222";
const row = (extra = {}) => ({ id, title: "Synthetic public article", excerpt: "Synthetic excerpt", category: "Testing", author: "Synthetic Author", image: "https://res.cloudinary.com/synthetic/image/upload/mock.png", publishedAt: "2026-11-09T10:00:00.000Z", ...extra });
const detail = (extra = {}) => row({ content: [{ type: "paragraph", text: "Synthetic body" }, { type: "heading", text: "Synthetic heading" }, { type: "quote", text: "Synthetic quote" }, { type: "image", src: row().image }], ...extra });
const page = (data = [], current = 1, total = data.length) => ({ success: true, data, pagination: { page: current, limit: 6, total, totalPages: Math.max(1, Math.ceil(total / 6)) } });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const client = request => ({ request });
test("frontend response boundaries share the server image policy for safe and private URLs", () => {
  for (const image of [row().image, "https://res.cloudinary.com/test/image/upload/c_fill,w_600/v123/folder/cover.jpg"]) { assert(blogImageUrl(image)); assert.equal(mapPublicBlogPost(row({ image })).image, image); }
  for (const image of ["https://res.cloudinary.com/test/image/private/cover.png", "https://res.cloudinary.com/test/image/authenticated/cover.png", row().image + "?__cld_token__=synthetic-only", row().image + "#synthetic-only", "https://res.cloudinary.com/test/raw/upload/cover.png"]) {
    assert.equal(blogImageUrl(image), false); assert.throws(() => mapPublicBlogPost(row({ image }))); assert.throws(() => mapPublicBlogPost(detail({ content: [{ type: "paragraph", text: "Synthetic" }, { type: "image", src: image }] }), true));
  }
});
test("all nine static articles/IDs remain available without API requests", async () => {
  const snapshots = JSON.stringify(blogPosts); let calls = 0;
  const reader = createPublicBlogReader({ client: client(() => { calls++; }), baseUrl: "http://127.0.0.1:5193" });
  for (let index = 1; index <= 9; index++) { const post = (await reader.load(String(index))).post; assert.equal(post, blogPosts[index - 1]); assert.equal(staticBlogPost(String(index)), post); }
  assert.equal(calls, 0); assert.equal(JSON.stringify(blogPosts), snapshots);
});
test("coexistence pins the original featured post, retains legacy ordering and deduplicates API IDs", () => {
  const mapped = mapPublicBlogPost(row());
  const combined = combinedBlogPosts([mapped, mapped, { ...mapped, id: "1" }]);
  assert.equal(combined.length, 10); assert.equal(combined[0], blogPosts[0]); assert.equal(combined[1], mapped); assert.deepEqual(combined.slice(2), blogPosts.slice(1));
  assert.deepEqual(combinedBlogPosts([]), blogPosts); assert.deepEqual(combinedBlogPosts([], []), []);
});
test("maps public fields/date and never retains admin, credentials or storage metadata", () => {
  const mapped = mapPublicBlogPost(detail({ createdBy: "private", revision: 4, token: "secret", coverImage: { public_id: "private-storage" } }), true);
  assert.equal(mapped.date, "November 9, 2026"); assert.equal(mapped.content.length, 4); assert.equal(mapped.authorAvatar, undefined);
  assert.deepEqual(Object.keys(mapped).sort(), ["id", "title", "excerpt", "category", "author", "image", "publishedAt", "date", "content"].sort());
});
test("rejects malformed metadata, draft flags, unsafe covers and private delivery URLs", () => {
  for (const extra of [{ id: "1" }, { title: null }, { excerpt: " " }, { category: "x".repeat(81) }, { author: {} }, { publishedAt: null }, { publishedAt: "not a date" }, { status: "draft" }, { image: "javascript:bad" }, { image: "https://res.cloudinary.com/synthetic/image/authenticated/private.png" }, { image: row().image + "?__cld_token__=private" }]) assert.throws(() => mapPublicBlogPost(row(extra)));
});
test("rejects invalid/HTML content and unsafe inline images without raw HTML rendering", () => {
  for (const content of [[], [{ type: "html", text: "<script>x</script>" }], [{ type: "paragraph", text: "<b>HTML</b>" }], [{ type: "paragraph", text: "Text" }, { type: "image", src: "https://res.cloudinary.com/synthetic/raw/authenticated/private" }]]) assert.throws(() => mapPublicBlogPost(detail({ content }), true));
});
test("validates success envelope, page bounds and duplicate rows", () => {
  assert.equal(mapPublicBlogPage(page([row()], 1, 7), 1).hasMore, true);
  for (const body of [{}, { ...page(), success: false }, { ...page(), data: null }, page([row(), row()]), page(Array.from({ length: 7 }, (_, index) => row({ id: (index + 1).toString(16).padStart(24, "0") }))), { ...page(), pagination: { page: 1 } }]) assert.throws(() => mapPublicBlogPage(body, 1));
  assert.throws(() => mapPublicBlogPage(page([], 2), 1));
});
test("feed exposes loading/ready/empty and uses only public unauthenticated requests", async () => {
  const states = [], calls = [], wait = deferred();
  const feed = createPublicBlogFeed({ client: client(options => { calls.push(options); return wait.promise; }), baseUrl: "http://127.0.0.1:5193", onChange: state => states.push(state) });
  const loading = feed.loadNext(); assert.equal(feed.snapshot().status, "loading"); await feed.loadNext(); assert.equal(calls.length, 1);
  wait.resolve({ data: page() }); await loading; assert.equal(feed.snapshot().status, "ready"); assert.equal(feed.snapshot().posts.length, 0); assert.equal(feed.snapshot().hasMore, false);
  assert.equal(calls[0].url, "http://127.0.0.1:5193/api/blog"); assert.equal(calls[0].headers.Authorization, undefined); assert.equal(calls[0].withCredentials, false); assert.equal(calls[0].qnduitBoundedRead, true); assert.deepEqual(calls[0].params, { page: 1, limit: 6 }); assert.deepEqual(states.map(state => state.status), ["loading", "ready"]);
});
test("pagination merges unique records, advances only confirmed pages and stops at the end", async () => {
  const calls = [];
  const feed = createPublicBlogFeed({ client: client(async options => { calls.push(options.params.page); return { data: options.params.page === 1 ? page([row()], 1, 7) : page([row(), row({ id: secondId })], 2, 7) }; }), baseUrl: "http://127.0.0.1:5193" });
  await feed.loadNext(); await feed.loadNext(); await feed.loadNext(); assert.deepEqual(calls, [1, 2]); assert.equal(feed.snapshot().posts.length, 2); assert.equal(feed.snapshot().hasMore, false);
});
test("failed later page retains posts and retries the same page without false empty success", async () => {
  const calls = []; let failing = true;
  const feed = createPublicBlogFeed({ client: client(async options => { calls.push(options.params.page); if (options.params.page === 2 && failing) throw Error("Synthetic network failure"); return { data: options.params.page === 1 ? page([row()], 1, 7) : page([row({ id: secondId })], 2, 7) }; }), baseUrl: "http://127.0.0.1:5193" });
  await feed.loadNext(); await feed.loadNext(); assert.equal(feed.snapshot().status, "error"); assert.equal(feed.snapshot().nextPage, 2); assert.equal(feed.snapshot().posts.length, 1);
  failing = false; await feed.loadNext(); assert.deepEqual(calls, [1, 2, 2]); assert.equal(feed.snapshot().posts.length, 2);
});
test("malformed response produces error and is retriable without losing static articles", async () => {
  let malformed = true;
  const feed = createPublicBlogFeed({ client: client(async () => ({ data: malformed ? { success: true, data: "wrong" } : page() })), baseUrl: "http://127.0.0.1:5193" });
  await feed.loadNext(); assert.equal(feed.snapshot().status, "error"); assert.equal(combinedBlogPosts(feed.snapshot().posts).length, 9); assert.equal(feed.snapshot().nextPage, 1);
  malformed = false; await feed.loadNext(); assert.equal(feed.snapshot().status, "ready");
});
test("cancelled feed drops late responses and supports StrictMode-style restart", async () => {
  const waits = [deferred(), deferred()], states = []; let calls = 0;
  const feed = createPublicBlogFeed({ client: client(() => waits[calls++].promise), baseUrl: "http://127.0.0.1:5193", onChange: state => states.push(state) });
  const first = feed.loadNext(); feed.cancel(); const second = feed.loadNext(); waits[1].resolve({ data: page([row()]) }); await second; waits[0].resolve({ data: page([row({ id: secondId })]) }); await first;
  assert.deepEqual(feed.snapshot().posts.map(post => post.id), [id]); assert.equal(states.filter(state => state.status === "ready").length, 1);
});
test("detail retrieval maps full public body and validates returned identity", async () => {
  const calls = [];
  const reader = createPublicBlogReader({ client: client(async options => { calls.push(options); return { data: { success: true, post: detail() } }; }), baseUrl: "http://127.0.0.1:5193" });
  assert.equal((await reader.load(id)).post.content.length, 4); assert.equal(calls[0].url, `http://127.0.0.1:5193/api/blog/${id}`); assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal((await reader.load(secondId)).status, "error");
});
test("invalid links, missing posts and API failures remain distinct; errors can retry", async () => {
  let mode = "missing", calls = 0;
  const reader = createPublicBlogReader({ client: client(async () => { calls++; if (mode === "missing") throw Object.assign(Error("Synthetic missing"), { response: { status: 404 } }); if (mode === "error") throw Error("Synthetic unavailable"); return { data: { success: true, post: detail() } }; }), baseUrl: "http://127.0.0.1:5193" });
  assert.equal((await reader.load("bad")).status, "invalid"); assert.equal(calls, 0); assert.equal((await reader.load(id)).status, "missing"); mode = "error"; assert.equal((await reader.load(id)).status, "error"); mode = "ok"; assert.equal((await reader.load(id)).status, "ready");
});
test("detail route changes and cancellation cannot display old articles", async () => {
  const wait = deferred(), states = [];
  const reader = createPublicBlogReader({ client: client(() => wait.promise), baseUrl: "http://127.0.0.1:5193", onChange: state => states.push(state) });
  const loading = reader.load(id); await reader.load("2"); wait.resolve({ data: { success: true, post: detail() } }); await loading; assert.equal(states.at(-1).post.id, "2");
  const other = deferred(); const cancelled = createPublicBlogReader({ client: client(() => other.promise), baseUrl: "http://127.0.0.1:5193", onChange: state => states.push(state) });
  const pending = cancelled.load(id); cancelled.cancel(); other.resolve({ data: { success: true, post: detail() } }); assert.equal(await pending, undefined);
});

test("subsequent public reads omit a deleted database post and return missing detail while static URLs survive", async () => {
  const feed = createPublicBlogFeed({client:client(async () => ({data:page([])})),baseUrl:"http://127.0.0.1:5193"});
  await feed.loadNext(); assert.equal(feed.snapshot().posts.length,0);
  assert.deepEqual(combinedBlogPosts(feed.snapshot().posts),blogPosts);
  let calls=0;
  const reader=createPublicBlogReader({client:client(async () => { calls++; throw {response:{status:404}}; }),baseUrl:"http://127.0.0.1:5193"});
  assert.equal((await reader.load(id)).status,"missing");
  for(let i=1;i<=9;i++) assert.equal((await reader.load(String(i))).status,"ready");
  assert.equal(calls,1);
});
