import process from "node:process";
import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import https from "node:https";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { seedExploreTalents, explorePassword, exploreId } from "./helpers/exploreTalentsFixture.js";

// Opt-in only: never load app/server/.env or use a configured database/provider.
test("EN500B authenticated discovery on isolated synthetic services", { skip: process.env.QNDUIT_EN500B_LOCAL_TEST !== "1" }, async t => {
  for (const transport of [http, https]) {
    const request = transport.request;
    t.mock.method(transport, "request", function(input, ...args) {
      const host = typeof input === "string" || input instanceof URL ? new URL(input).hostname : input.hostname || input.host;
      assert(["127.0.0.1", "localhost"].includes(host), "External requests blocked");
      return request.call(this, input, ...args);
    });
  }
  process.env.JWT_SECRET = "en500b-local-test-only";
  process.env.NOTIFICATION_CAPTURE_ENABLED = "false";
  process.env.NOTIFICATION_DELIVERY_ENABLED = "false";
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await mongoose.connect(`mongodb://127.0.0.1:27946/qnduit_en500b_test_${process.pid}_${Date.now()}`, { autoIndex: false, serverSelectionTimeoutMS: 3000 });
  await seedExploreTalents();
  const { default: genRoutes } = await import("../src/routes/genRoutes.js");
  const { default: profileRoutes } = await import("../src/routes/profileRoutes.js");
  const { default: followRoutes } = await import("../src/routes/followRoutes.js");
  const { protect, authorize } = await import("../src/middleware/authMiddleware.js");
  const { loginUser } = await import("../src/controllers/authController.js");
  const { addSavedCandidate, getSavedCandidates, removeSavedCandidate } = await import("../src/controllers/employerController.js");
  const app = express(); app.use(express.json());
  app.post("/api/auth/login", loginUser);
  app.use("/api/gen", genRoutes); app.use("/api/profiles", profileRoutes); app.use("/api/follows", followRoutes);
  app.get("/api/employers/saved-candidates", protect, authorize("employer"), getSavedCandidates);
  app.post("/api/employers/saved-candidates/:id", protect, authorize("employer"), addSavedCandidate);
  app.delete("/api/employers/saved-candidates/:id", protect, authorize("employer"), removeSavedCandidate);
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const request = async (path, token, method = "GET", body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const login = async n => (await request("/auth/login", null, "POST", { email: `employer${n}@en500b.example.invalid`, password: explorePassword })).body.token;
  const a = await login(1), b = await login(2);
  assert(a && b);
  const search = (query = "") => request(`/gen/search?userType=talent&${query}`, a);
  await t.test("browse visibility, name/title search and literal queries", async () => {
    assert.equal((await request("/gen/search?userType=talent")).status, 401);
    assert.equal((await search()).body.total, 15);
    for (const term of ["Ada Okafor", "OKAF", "Product Designer", "Frontend Engineer", "[.*"]) {
      const result = await search(`query=${encodeURIComponent(term)}`);
      assert.equal(result.body.total, term === "Product Designer" ? 2 : term === "[.*" ? 0 : 1);
    }
    for (const term of ["Hidden", "Suspended", "Unverified"]) assert.equal((await search(`query=${term}`)).body.total, 0);
  });
  await t.test("working combined filters and genuinely unfiltered reset", async () => {
    const filtered = await search(new URLSearchParams({ location: "canada", experience: "3–5 years", qualification: "Master Degree" }));
    assert.equal(filtered.body.total, 1); assert.equal(filtered.body.results[0].fullName, "Maya Chen");
    assert.equal((await search("minAge=18&maxAge=65")).body.total, 14);
    assert.equal((await search()).body.total, 15);
    assert.equal((await search("experience=invalid")).status, 400);
  });
  await t.test("stable server pagination, newest ordering and out-of-range response", async () => {
    const first = (await search("limit=6")).body, second = (await search("limit=6&page=2")).body;
    assert.equal(first.totalPages, 3); assert.equal(first.results.length, 6);
    assert(!second.results.some(row => first.results.some(other => row._id === other._id)));
    assert.equal((await search("page=99")).body.results.length, 0);
    assert.equal((await search("sort=newest")).body.results[0]._id, String(exploreId(15)));
  });
  await t.test("skills from tags and Resume titles, exact case/outer-space normalization and combined filters", async () => {
    const ids = async params => (await search(new URLSearchParams(params))).body.results.map(row => row._id);
    assert.deepEqual(await ids({ skill: "  uX rEsEaRcH  ", category: " design " }), [1, 2].map(n => String(exploreId(n))));
    assert.deepEqual(await ids({ skill: "FIGMA" }), [1, 2].map(n => String(exploreId(n))));
    assert.deepEqual(await ids({ skill: "React", category: " technology " }), [String(exploreId(3))]);
    assert.deepEqual(await ids({ query: "Product Designer", skill: "UX Research", category: "Design", location: "canada", experience: "3–5 years", qualification: "Master Degree" }), [String(exploreId(2))]);
    assert.deepEqual(await ids({ skill: "UX  Research" }), []); // Interior whitespace is literal.
    assert.deepEqual(await ids({ skill: "UX" }), []); // No partial matching or alias expansion.
    assert.deepEqual(await ids({ skill: "  ", category: "  " }), [1, 2, 3, 4, 5, 6].map(n => String(exploreId(n))));
  });
  await t.test("literal punctuation, missing sources, safe scalars and unchanged mixed consumers", async () => {
    const filtered = async params => search(new URLSearchParams(params));
    assert.equal((await filtered({ skill: "C++" })).body.total, 2);
    assert.equal((await filtered({ skill: "Design, Research" })).body.total, 1);
    assert.equal((await filtered({ category: "R&D [Labs]" })).body.total, 1);
    for (const key of ["skill", "category"]) {
      for (const value of [".*", "[", "$", '{"$ne":null}', "\\"]) assert.equal((await filtered({ [key]: value })).body.total, 0);
      assert.equal((await search(`${key}=one&${key}=two`)).status, 400);
      assert.equal((await filtered({ [key]: "x".repeat(201) })).status, 400);
    }
    assert.equal((await filtered({ skill: "NobodyMatches" })).body.total, 0);
    assert.equal((await filtered({ category: "Research" })).body.total, 11); // Empty/missing categories do not match; missing Resume is fine.
    const mixed = await request("/gen/search?query=Product&skill=does-not-match&category=does-not-match", a);
    assert.equal(mixed.status, 200); assert.equal(mixed.body.results.length, 2);
  });
  await t.test("filtered totals before pagination, no duplicate Talent rows, explicit response fields and visibility", async () => {
    const first = (await search("skill=research&category=Research&limit=6")).body;
    const second = (await search("skill=research&category=Research&limit=6&page=2")).body;
    assert.equal(first.total, 7); assert.equal(first.totalPages, 2); assert.equal(first.results.length, 6); assert.equal(second.results.length, 1);
    assert(!second.results.some(row => first.results.some(other => row._id === other._id)));
    assert.equal((await search("skill=research&category=Research&sort=newest")).body.results[0]._id, String(exploreId(10)));
    assert.equal((await search("skill=figma")).body.total, 2); // Ada has two matching Resume records.
    assert.equal((await search("skill=UX%20Research&category=Design")).body.total, 2); // Hidden/ineligible tags excluded.
    const regular = (await search()).body.results[0], filtered = (await search("skill=figma")).body.results[0];
    assert.deepEqual(Object.keys(filtered).sort(), Object.keys(regular).sort());
    assert(!/matchingResume|cvFiles|PRIVATE-CV|password|skills|tags/.test(JSON.stringify(filtered)));
    assert.equal((await search("skill=research&page=99")).body.results.length, 0);
  });
  await t.test("account-owned persistent save/unsave and role checks", async () => {
    const path = `/employers/saved-candidates/${exploreId(1)}`;
    for (let i = 0; i < 2; i++) assert.equal((await request(path, a, "POST")).status, 200);
    assert.equal((await request("/employers/saved-candidates", a)).body.savedCandidates.length, 1);
    assert.equal((await request("/employers/saved-candidates", b)).body.savedCandidates.length, 0);
    const talent = jwt.sign({ id: String(exploreId(1)), role: "talent" }, process.env.JWT_SECRET);
    assert.equal((await request(path, talent, "POST")).status, 403);
    assert.equal((await request(path, a, "DELETE")).status, 200);
    assert.equal((await request("/employers/saved-candidates", a)).body.savedCandidates.length, 0);
  });
  await t.test("existing profiles, private boundaries, local view writes and follow interactions", async () => {
    const path = `/profiles/talent/${exploreId(1)}`;
    const profile = (await request(path, a)).body;
    assert.equal(profile.profile.firstName, "Ada"); assert(profile.canFollow);
    assert(!/email|password|phone|cvFiles/.test(JSON.stringify(profile)));
    assert.equal((await request(`${path}/views`, a, "POST")).status, 200);
    assert.equal((await request(`/profiles/talent/${exploreId(16)}`, a)).status, 404);
    const follow = `/follows/talents/${exploreId(1)}`;
    assert.equal((await request(follow, a, "POST")).status, 200);
    assert.equal((await request(path, a)).body.isFollowing, true);
    assert.equal((await request(path, b)).body.isFollowing, false);
    assert.equal((await request(follow, a, "DELETE")).status, 200);
  });
});
