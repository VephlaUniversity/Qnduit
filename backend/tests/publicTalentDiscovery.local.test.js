import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import https from "node:https";
import express from "express";
import mongoose from "mongoose";
import { seedPublicTalentDiscovery } from "./helpers/publicTalentDiscoveryFixture.js";

// Explicit opt-in, fixed loopback database, no app/server startup or .env loading.
test("EN499B public discovery: isolated synthetic API", { skip: process.env.QNDUIT_EN499B_LOCAL_TEST !== "1" }, async t => {
  for (const transport of [http, https]) {
    const original = transport.request;
    t.mock.method(transport, "request", function(input, ...args) {
      const host = typeof input === "string" || input instanceof URL ? new URL(input).hostname : input.hostname || input.host;
      assert(["127.0.0.1", "localhost"].includes(host), "External requests are blocked");
      return original.call(this, input, ...args);
    });
  }
  const dbName = `qnduit_en499b_test_${process.pid}_${Date.now()}`;
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await mongoose.connect(`mongodb://127.0.0.1:27941/${dbName}`, { autoIndex: false, serverSelectionTimeoutMS: 3000 });
  await seedPublicTalentDiscovery();
  const { listPublicTalents, getPublicTalentProfile } = await import("../src/controllers/talentController.js");
  const app = express();
  app.get("/api/talents/public", listPublicTalents);
  app.get("/api/talents/public/:username", getPublicTalentProfile);
  // Express identifies error handlers by their four-argument signature.
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => { res.status(500).json({ message: error.message }); });
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const get = async path => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/talents/public${path}`);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  };
  await t.test("full split name, partial/case-insensitive names and professional titles", async () => {
    for (const q of ["Ada Okafor", "okaf", "ADA"]) assert.deepEqual((await get(`?q=${encodeURIComponent(q)}`)).body.talents.map(row => row.username), ["ada-okafor"]);
    assert.deepEqual((await get("?q=product%20designer")).body.talents.map(row => row.username), ["ada-okafor", "maya-chen"]);
    assert.deepEqual((await get("?q=frontend")).body.talents.map(row => row.username), ["tunde-bello"]);
    assert.equal((await get("?q=%5B.*")).body.total, 0);
  });
  await t.test("hidden/ineligible profiles excluded from list, counts and direct profiles", async () => {
    const all = await get("?limit=24"); assert.equal(all.body.total, 15); assert.equal(all.body.talents.length, 15);
    for (const username of ["hidden-designer", "unpaid-designer", "expired-designer", "unverified-designer", "suspended-designer", "disabled-designer"]) {
      assert.equal((await get(`/${username}`)).status, 404);
      assert.equal((await get(`?q=${username.split("-")[0]}`)).body.total, 0);
    }
  });
  await t.test("explicit public card/profile fields, no credentials, contacts, CV or storage keys", async () => {
    const list = await get("?q=Ada"); assert.equal(list.cache, "private, no-store");
    assert.deepEqual(Object.keys(list.body.talents[0]).sort(), ["id", "username", "name", "jobTitle", "location", "experienceTime", "skills", "avatar"].sort());
    const profile = await get("/ada-okafor"); assert.equal(profile.status, 200);
    for (const body of [list.body, profile.body]) assert(!/PRIVATE-|private-0|verificationCode|storageKey|cvFiles|password|phone|email/.test(JSON.stringify(body)));
  });
  await t.test("existing filters, stable pagination, empty and invalid filter states", async () => {
    assert.deepEqual((await get("?q=Designer&country=Canada&experience=1%E2%80%933%20years&qualification=Bachelor%20Degree")).body.talents.map(row => row.username), ["maya-chen"]);
    const one = (await get("?limit=12")).body, two = (await get("?limit=12&page=2")).body;
    assert.equal(one.pages, 2); assert.equal(one.talents.length, 12); assert.equal(two.talents.length, 3);
    assert(!two.talents.some(row => one.talents.some(other => row.id === other.id)));
    assert.equal((await get("?q=NobodyMatches")).body.total, 0);
    assert.equal((await get("?experience=invalid")).status, 400);
  });
});
