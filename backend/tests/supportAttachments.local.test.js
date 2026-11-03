import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, readdir } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createSupportRouter } from "../src/routes/supportRoutes.js";
import SupportTicket from "../src/models/SupportTicket.js";
import Operation from "../src/models/SupportReplyOperation.js";
import { seedSupportHistory, supportId } from "./helpers/supportHistoryFixture.js";
import { supportAttachmentStorage } from "../src/utils/supportAttachments/storage.js";
import { cloudAttachmentStorage } from "../src/utils/messageAttachments/storage.js";
import { mockSupportStorage } from "./helpers/mockSupportStorage.js";

const jpg = await readFile(new URL("./fixtures/support-screenshot.jpg", import.meta.url));
const png = await readFile(new URL("./fixtures/support-screenshot.png", import.meta.url));
test("Support screenshots: isolated HTTP/MongoDB with mocked private provider", { skip: process.env.QNDUIT_EN499B_ATTACHMENTS_LOCAL_TEST !== "1" }, async t => {
  for (const transport of [http, https]) { const original = transport.request; t.mock.method(transport, "request", function(input, ...args) {
    const host = typeof input === "string" || input instanceof URL ? new URL(input).hostname : input.hostname || input.host;
    assert(["127.0.0.1", "localhost"].includes(host), "External services blocked"); return original.call(this, input, ...args);
  }); }
  process.env.JWT_SECRET = "synthetic-support-attachments";
  const root = await mkdtemp("/private/tmp/qnduit-support-attachments-test-");
  const mock = mockSupportStorage(root); let server;
  t.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); mock.restore(); });
  await mongoose.connect(`mongodb://127.0.0.1:27941/qnduit_en499b_support_attach_test_${process.pid}_${Date.now()}`, { autoIndex: false, serverSelectionTimeoutMS: 3000 });
  const accounts = await seedSupportHistory();
  const app = express(); app.use(express.json()); app.use("/api/support", createSupportRouter({ storageFactory: mock.storageFactory }));
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api/support`;
  const auth = name => ({ Authorization: `Bearer ${jwt.sign({ id: String(accounts[name]._id), role: name === "suspended" ? "talent" : name }, process.env.JWT_SECRET)}` });
  const post = async ({ role = "talent", ticket = 300, key, message = "Synthetic screenshot reply", files = [{ name: "evidence.jpg", bytes: jpg }], json = false }) => {
    const body = json ? JSON.stringify({ message, ...(key ? { clientReplyId: key } : {}) }) : new FormData();
    if (!json) { body.append("message", message); if (key) body.append("clientReplyId", key); for (const file of files) body.append("attachments", new Blob([file.bytes], { type: file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg" }), file.name); }
    const response = await fetch(`${base}/${role === "admin" ? "admin/" : ""}tickets/${supportId(ticket)}/replies`, { method: "POST", headers: { ...auth(role), ...(json ? { "Content-Type": "application/json" } : {}) }, body });
    return { status: response.status, body: await response.json() };
  };
  const get = async (path, role) => { const response = await fetch(base + path, { headers: role ? auth(role) : {} }); return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) }; };
  const key = value => `synthetic-request-${value}`;
  let ownerReply, adminReply;
  await t.test("Support opt-in and staging are independent of messaging", async () => {
    const previous = Object.fromEntries(["SUPPORT_ATTACHMENTS_ENABLED", "SUPPORT_ATTACHMENT_STORAGE", "SUPPORT_ATTACHMENT_DIR", "MESSAGE_ATTACHMENTS_ENABLED", "MESSAGE_ATTACHMENT_STORAGE", "MESSAGE_ATTACHMENT_DIR"].map(key => [key, process.env[key]]));
    try {
      process.env.MESSAGE_ATTACHMENTS_ENABLED = "true"; process.env.MESSAGE_ATTACHMENT_STORAGE = "cloudinary"; process.env.MESSAGE_ATTACHMENT_DIR = root;
      delete process.env.SUPPORT_ATTACHMENTS_ENABLED;
      await assert.rejects(supportAttachmentStorage(), /disabled/);
      process.env.SUPPORT_ATTACHMENTS_ENABLED = "true"; process.env.SUPPORT_ATTACHMENT_STORAGE = "cloudinary"; process.env.SUPPORT_ATTACHMENT_DIR = root;
      await assert.rejects(supportAttachmentStorage(), /separate/);
      process.env.SUPPORT_ATTACHMENT_DIR = root + "-support"; process.env.MESSAGE_ATTACHMENTS_ENABLED = "false";
      assert((await supportAttachmentStorage()).root.endsWith("-support"));
      await assert.rejects(cloudAttachmentStorage(), /disabled/);
    } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  });
  await t.test("valid JPG/JPEG screenshot replies in both directions; file-only and text-only; public DTOs", async () => {
    const before = await SupportTicket.collection.findOne({ _id: supportId(300) });
    const owner = await post({ key: key("owner"), message: "", files: [{ name: "evidence.JPG", bytes: jpg }] }); assert.equal(owner.status, 200, JSON.stringify(owner.body)); ownerReply = owner.body.data.replies.at(-1);
    assert.equal(ownerReply.attachments.length, 1); assert.equal(ownerReply.message, "");
    const admin = await post({ role: "admin", key: key("admin"), files: [{ name: "admin.jpeg", bytes: jpg }] }); assert.equal(admin.status, 200); adminReply = admin.body.data.replies.at(-1);
    assert.deepEqual(Object.keys(ownerReply.attachments[0]).sort(), ["id", "name", "mime", "size"].sort());
    assert(!/storageKey|sha256|requestKey|fingerprint|message-attachments|synthetic-only/.test(JSON.stringify(admin.body)));
    assert.equal((await post({ key: key("text"), json: true })).status, 200);
    assert.equal((await post({ json: true })).status, 200); // legacy text client
    const after = await SupportTicket.collection.findOne({ _id: supportId(300) }); assert.equal(after.message, before.message); assert.deepEqual(after.replies.slice(0, 4), before.replies); assert.equal(after.status, before.status);
  });
  await t.test("owner/Admin viewing and downloads, cross-owner and unauthenticated denial", async () => {
    for (const reply of [ownerReply, adminReply]) {
      const path = `/tickets/${supportId(300)}/replies/${reply._id}/attachments/${reply.attachments[0].id}`;
      for (const role of ["talent", "admin"]) { const res = await get(path + "?view=1", role); assert.equal(res.status, 200); assert.deepEqual(res.bytes, jpg); assert.equal(res.headers.get("cache-control"), "private, no-store"); assert.match(res.headers.get("content-disposition"), /^inline/); }
      assert.match((await get(path, "talent")).headers.get("content-disposition"), /^attachment/);
      for (const role of ["employer", "suspended"]) assert.equal((await get(path, role)).status, 404);
      assert.equal((await get(path)).status, 401);
      assert.equal((await get(path.replace(String(supportId(300)), String(supportId(302))), "admin")).status, 404);
    }
  });
  await t.test("PNG replies round-trip in both directions with canonical type and protected downloads", async () => {
    for (const role of ["talent", "admin"]) {
      const result = await post({ role, key: key(`png-${role}`), files: [{ name: `${role}-evidence.PNG`, bytes: png }] });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const reply = result.body.data.replies.at(-1), file = reply.attachments[0];
      assert.equal(file.mime, "image/png");
      const path = `/tickets/${supportId(300)}/replies/${reply._id}/attachments/${file.id}`;
      for (const viewer of ["talent", "admin"]) {
        const viewed = await get(path + "?view=1", viewer); assert.equal(viewed.status, 200); assert.equal(viewed.headers.get("content-type"), "image/png"); assert.deepEqual(viewed.bytes, png);
        const downloaded = await get(path, viewer); assert.equal(downloaded.status, 200); assert.deepEqual(downloaded.bytes, png); assert.match(downloaded.headers.get("content-disposition"), /^attachment/);
      }
      assert.equal((await get(path, "employer")).status, 404);
      assert(!/storageKey|sha256|requestKey/.test(JSON.stringify(result.body)));
    }
  });
  await t.test("extension/content/count/size/total limits reject before provider uploads", async () => {
    const uploads = mock.stats.uploads;
    for (const files of [[{ name: "fake.jpg", bytes: Buffer.from("not a JPEG") }], [{ name: "fake.png", bytes: Buffer.from("not a PNG") }], [{ name: "truncated.png", bytes: png.subarray(0, -10) }], [{ name: "disguised.jpg", bytes: png }], [{ name: "disguised.jpeg", bytes: png }], [{ name: "unsupported.gif", bytes: png }], [{ name: "truncated.jpg", bytes: jpg.subarray(0, -2) }], [{ name: "image.png", bytes: jpg }], [{ name: "empty.jpg", bytes: Buffer.alloc(0) }], Array.from({ length: 6 }, () => ({ name: "many.jpg", bytes: jpg })), [{ name: "large.jpg", bytes: Buffer.alloc(10000001) }], Array.from({ length: 3 }, () => ({ name: "total.jpg", bytes: Buffer.alloc(9000000) }))]) {
      const res = await post({ key: key("invalid"), files }); assert([400, 413].includes(res.status), JSON.stringify(res.body));
    }
    assert.equal(mock.stats.uploads, uploads);
    assert.equal((await post({ key: undefined })).status, 400);
    assert.equal((await post({ role: "employer", key: key("cross") })).status, 404);
  });
  await t.test("committed and concurrent retries do not duplicate replies or provider uploads", async () => {
    const beforeUploads = mock.stats.uploads;
    const replay = await post({ key: key("owner"), message: "", files: [{ name: "evidence.JPG", bytes: jpg }] }); assert.equal(replay.status, 200); assert.equal(mock.stats.uploads, beforeUploads);
    assert.equal((await post({ key: key("owner"), message: "changed", files: [{ name: "evidence.JPG", bytes: jpg }] })).status, 409);
    mock.stats.delay = 50;
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => post({ key: key("parallel") })));
    mock.stats.delay = 0; assert(outcomes.some(row => row.status === 200)); assert(outcomes.every(row => [200, 409].includes(row.status))); assert.equal(mock.stats.uploads, beforeUploads + 1);
    assert.equal((await post({ key: key("parallel") })).status, 200); assert.equal(mock.stats.uploads, beforeUploads + 1);
    const operations = await Operation.find({}).lean(); const op = operations.find(row => row.state === "committed" && row.fingerprint);
    assert(op); const doc = await SupportTicket.collection.findOne({ _id: supportId(300) }); assert.equal(doc.replies.filter(row => row.message === "Synthetic screenshot reply" && row.attachments?.[0]?.name === "evidence.jpg").length, 1);
  });
  await t.test("confirmed noncommit cleans assets; unknown save retains them; acknowledged save despite error replays safely", async () => {
    const original = SupportTicket.findOneAndUpdate.bind(SupportTicket), assets = mock.assets.size, destroys = mock.stats.destroys;
    const noCommit = t.mock.method(SupportTicket, "findOneAndUpdate", () => ({ lean: async () => null }));
    assert.equal((await post({ key: key("known-failure") })).status, 404); noCommit.mock.restore(); assert.equal(mock.assets.size, assets); assert.equal(mock.stats.destroys, destroys + 1);
    assert.equal((await post({ key: key("known-failure") })).status, 200);
    const unknown = t.mock.method(SupportTicket, "findOneAndUpdate", () => ({ lean: async () => { throw Error("Unknown DB outcome"); } }));
    const before = mock.assets.size; assert.equal((await post({ key: key("uncertain") })).status, 503); unknown.mock.restore(); assert.equal(mock.assets.size, before + 1);
    const uploads = mock.stats.uploads; assert.equal((await post({ key: key("uncertain") })).status, 409); assert.equal(mock.stats.uploads, uploads);
    const lostAck = t.mock.method(SupportTicket, "findOneAndUpdate", (...args) => ({ lean: async () => { await original(...args).lean(); throw Error("Saved but response lost"); } }));
    assert.equal((await post({ key: key("lost-ack") })).status, 200); lostAck.mock.restore(); const count = mock.stats.uploads; assert.equal((await post({ key: key("lost-ack") })).status, 200); assert.equal(mock.stats.uploads, count);
    mock.stats.failUpload = true; const prior = mock.assets.size; assert.equal((await post({ key: key("provider-uncertain") })).status, 503); mock.stats.failUpload = false; assert.equal(mock.assets.size, prior + 1);
    assert((await readdir(root)).length >= 2, "Uncertain upload intents must be retained");
  });
  await t.test("suspended owners and free Employers can upload/view; legacy history remains intact", async () => {
    for (const [role, ticket] of [["suspended", 303], ["employer", 302]]) {
      const reply = (await post({ role, ticket, key: key(role) })).body.data.replies.at(-1);
      const path = `/tickets/${supportId(ticket)}/replies/${reply._id}/attachments/${reply.attachments[0].id}`;
      assert.equal((await get(path, role)).status, 200); assert.equal((await get(path, "admin")).status, 200);
    }
    const before = await SupportTicket.collection.findOne({ _id: supportId(301) });
    const legacy = await post({ role: "admin", ticket: 301, key: key("legacy") }); assert.equal(legacy.status, 200); assert.equal(legacy.body.data.replies[4].createdAt, undefined);
    const after = await SupportTicket.collection.findOne({ _id: supportId(301) }); assert.deepEqual(after.replies.slice(0, 5), before.replies); assert.equal(after.ownerId, undefined);
    assert.equal((await post({ ticket: 301, key: key("email") })).status, 404);
  });
});
