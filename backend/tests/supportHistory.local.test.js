import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import https from "node:https";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import supportRoutes from "../src/routes/supportRoutes.js";
import SupportTicket from "../src/models/SupportTicket.js";
import { seedSupportHistory, supportId } from "./helpers/supportHistoryFixture.js";
import { supportConversation, formatSupportTime } from "../../src/components/utils/supportConversation.js";

test("Support history: real isolated local API/database", { skip: process.env.QNDUIT_EN499B_SUPPORT_LOCAL_TEST !== "1" }, async t => {
  for (const transport of [http, https]) {
    const original = transport.request;
    t.mock.method(transport, "request", function(input, ...args) {
      const host = typeof input === "string" || input instanceof URL ? new URL(input).hostname : input.hostname || input.host;
      assert(["127.0.0.1", "localhost"].includes(host), "Production HTTP services are blocked");
      return original.call(this, input, ...args);
    });
  }
  const previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = "en499b-support-isolated-test";
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  });
  await mongoose.connect(`mongodb://127.0.0.1:27941/qnduit_en499b_support_test_${process.pid}_${Date.now()}`, { autoIndex: false, serverSelectionTimeoutMS: 3000 });
  const accounts = await seedSupportHistory();
  const app = express(); app.use(express.json()); app.use("/api/support", supportRoutes);
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const token = name => jwt.sign({ id: String(accounts[name]._id), role: name === "suspended" ? "talent" : name }, process.env.JWT_SECRET);
  const request = async (path, name = "talent", method = "GET", body) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/support${path}`, { method, headers: { "Content-Type": "application/json", ...(name ? { Authorization: `Bearer ${token(name)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
  };
  await t.test("owner/Admin complete history, legacy author/date handling and no email ownership inference", async () => {
    const all = (await request("/admin/tickets?limit=50", "admin")).body.data;
    const current = all.find(row => row.id === String(supportId(300)));
    assert.equal(current.message, "Original message is preserved exactly."); assert.equal(current.replies.length, 4);
    assert.deepEqual(supportConversation(current).map(row => row.message), [current.message, "Legacy Admin response one.", "User follow-up two.", "Admin response three.", "User follow-up four."]);
    assert.equal(formatSupportTime(current.replies[0].createdAt), "3 Nov 2026, 09:02:00 WAT");
    const legacy = all.find(row => row.id === String(supportId(301))); assert.equal(legacy.replies.length, 5);
    assert.equal(formatSupportTime(legacy.replies.at(-1).createdAt), "Date/time unavailable");
    const own = (await request("/tickets/mine?limit=50")).body.data;
    assert(own.some(row => row.id === current.id)); assert(!own.some(row => row.id === legacy.id));
    assert.equal((await request(`/tickets/${legacy.id}/replies`, "talent", "POST", { message: "Do not infer by email" })).status, 404);
    const storedBefore = await SupportTicket.collection.findOne({ _id: supportId(301) });
    const legacyReply = await request(`/admin/tickets/${legacy.id}/replies`, "admin", "POST", { message: "New legacy Admin reply" });
    assert.equal(legacyReply.status, 200);
    assert.equal(legacyReply.body.data.replies[4].createdAt, undefined);
    const legacyStatus = await request(`/admin/tickets/${legacy.id}/status`, "admin", "PATCH", { status: "Closed" });
    assert.equal(legacyStatus.body.data.replies[4].createdAt, undefined);
    const storedAfter = await SupportTicket.collection.findOne({ _id: supportId(301) });
    assert.deepEqual(storedAfter.replies.slice(0, 5), storedBefore.replies); assert.equal(storedAfter.message, storedBefore.message); assert.equal(storedAfter.ownerId, undefined);
    assert.equal(storedAfter.replies[4].createdAt, undefined);
  });
  await t.test("concurrent owner/Admin appends and status update preserve every prior/new message", async () => {
    const before = await SupportTicket.collection.findOne({ _id: supportId(300) });
    const outcomes = await Promise.all([
      ...Array.from({ length: 20 }, (_, i) => request(i % 2 ? `/admin/tickets/${supportId(300)}/replies` : `/tickets/${supportId(300)}/replies`, i % 2 ? "admin" : "talent", "POST", { message: `Concurrent reply ${i}` })),
      request(`/admin/tickets/${supportId(300)}/status`, "admin", "PATCH", { status: "Resolved" }),
    ]);
    assert(outcomes.every(row => row.status === 200));
    const after = await SupportTicket.collection.findOne({ _id: supportId(300) });
    assert.equal(after.replies.length, before.replies.length + 20); assert.deepEqual(after.replies.slice(0, 4), before.replies);
    assert.equal(after.message, before.message); assert.equal(after.status, "Resolved");
    assert.equal(new Set(after.replies.slice(4).map(row => row.message)).size, 20);
    assert.equal(new Set(after.replies.map(row => String(row._id))).size, 24);
    assert(after.replies.slice(4).every(row => row.createdAt instanceof Date));
    const refreshed = (await request("/tickets/mine?limit=50")).body.data.find(row => row.id === String(supportId(300)));
    assert.equal(refreshed.replies.length, 24);
  });
  await t.test("owner isolation, role authorization, invalid IDs and suspended-owner Support access", async () => {
    assert.equal((await request("/tickets/mine", null)).status, 401);
    assert.equal((await request("/admin/tickets", "talent")).status, 403);
    assert.equal((await request("/tickets/mine", "admin")).status, 403);
    for (const [name, id] of [["employer", 300], ["talent", 302], ["suspended", 300]]) assert.equal((await request(`/tickets/${supportId(id)}/replies`, name, "POST", { message: "Cross-owner attempt" })).status, 404);
    assert.equal((await request("/tickets/invalid/replies", "talent", "POST", { message: "Invalid ID" })).status, 400);
    assert.equal((await request(`/tickets/${supportId(300)}/replies`, "talent", "POST", { message: " " })).status, 400);
    assert.equal((await request(`/admin/tickets/${supportId(999)}/replies`, "admin", "POST", { message: "Missing ticket" })).status, 404);
    assert.equal((await request("/tickets/mine", "suspended")).status, 200);
    assert.equal((await request(`/tickets/${supportId(303)}/replies`, "suspended", "POST", { message: "Suspended owner can contact Support" })).status, 200);
    assert.equal((await request("/tickets", "suspended", "POST", { category: "Technical", title: "Suspended request", message: "Suspended owner ticket message." })).status, 201);
  });
  await t.test("pagination beyond ten and refresh expose all owned tickets without leaking others", async () => {
    const first = (await request("/tickets/mine?page=1&limit=10")).body;
    const second = (await request("/tickets/mine?page=2&limit=10")).body;
    assert.equal(first.pagination.total, 13); assert.equal(first.pagination.totalPages, 2);
    assert.equal(first.data.length, 10); assert.equal(second.data.length, 3);
    assert(!second.data.some(row => first.data.some(other => row.id === other.id)));
    assert([...first.data, ...second.data].every(row => row.ownerId === String(accounts.talent._id)));
    assert.equal((await request("/tickets/mine", "employer")).body.pagination.total, 1);
  });
});
