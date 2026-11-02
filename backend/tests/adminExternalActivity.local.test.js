import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import routes from "../src/routes/adminJobRoutes.js";
import Activity from "../src/models/ExternalApplicationActivity.js";
import Admin from "../src/models/Admin.js";
import Talent from "../src/models/Talent.js";
import Employer from "../src/models/Employer.js";
import Job from "../src/models/Job.js";
import AdminJob from "../src/models/AdminJob.js";
import AdminJobApplication from "../src/models/AdminJobApplication.js";

test("Admin external activity: isolated synthetic HTTP/MongoDB", { skip: process.env.ADMIN_EXTERNAL_ACTIVITY_LOCAL_TEST !== "1" }, async t => {
  const secret = process.env.JWT_SECRET; process.env.JWT_SECRET = "admin-activity-local-only";
  let server;
  t.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret; });
  await mongoose.connect(`mongodb://127.0.0.1:27933/qnduit_admin_activity_test_${process.pid}_${Date.now()}`, { autoIndex: false, autoCreate: false });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const admin = { _id: id(1), isActive: true }, other = { _id: id(2), isActive: true }, inactive = { _id: id(3), isActive: false };
  await Admin.collection.insertMany([admin, other, inactive]);
  await Talent.collection.insertOne({ _id: id(4), fullName: "Ada Synthetic", accountStatus: "active", isVerified: true, email: "private@example.invalid" });
  await Employer.collection.insertOne({ _id: id(5), accountStatus: "active", isVerified: true });
  await Job.collection.insertOne({ _id: id(10), jobTitle: "EMPLOYER COLLISION", applicantsCount: 8 });
  await AdminJob.collection.insertOne({ _id: id(10), jobTitle: "Changed current title", isDeleted: false, applicantsCount: 7 });
  await AdminJobApplication.collection.insertOne({ _id: id(20), jobId: id(10), applicantId: id(4), status: "shortlisted" });
  const destination = "https://example.invalid/apply?ref=a%2Bb&ref=a+b&empty=#section";
  await Activity.createCollection(); await Activity.createIndexes();
  await Activity.collection.insertMany(Array.from({ length: 25 }, (_, n) => ({ _id: String(n).padStart(3, "0"), intentId: `synthetic-${n}`, source: "admin", jobId: id(10), talentId: n === 24 ? id(99) : id(4), posterId: id(1), posterType: "Admin", clickedAt: new Date("2026-11-02T10:00:00Z"), destinationUrl: destination, display: { jobTitle: "Recorded Designer", companyName: "Recorded Company", privateField: "secret" } })));
  await Activity.collection.insertOne({ _id: "employer", intentId: "employer", source: "employer", jobId: id(10), talentId: id(4), clickedAt: new Date(), destinationUrl: "https://example.invalid/EMPLOYER_SECRET" });
  const app = express(); app.use(express.json()); app.use("/api/admin/posted-jobs", routes);
  server = await new Promise(resolve => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  const token = (record = admin, role = "admin") => jwt.sign({ id: String(record._id), role }, process.env.JWT_SECRET);
  const get = async (query = "", auth = token(), path = "external-activities") => { const res = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/posted-jobs/${path}?${query}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} }); return { status: res.status, data: await res.json(), cache: res.headers.get("cache-control") }; };
  await t.test("active Admin authorization, non-Admin denial and private caching", async () => {
    for (const auth of ["", "invalid"]) assert.equal((await get("", auth)).status, 401);
    for (const auth of [token(inactive), token({ _id: id(4) }, "talent"), token({ _id: id(5) }, "employer")]) assert.equal((await get("", auth)).status, 403);
    assert.equal((await get("", token(other))).data.pagination.total, 25);
    assert.equal((await get()).cache, "private, no-store");
  });
  await t.test("source fixed despite colliding IDs, explicit allowlist and exact URL", async () => {
    const data = (await get()).data;
    assert.equal(data.pagination.total, 25); assert(data.activities.every(row => row.source === "admin" && row.destinationUrl === destination));
    assert(!JSON.stringify(data).includes("EMPLOYER")); assert(!JSON.stringify(data).includes("private@example")); assert(!JSON.stringify(data).includes("intentId"));
    assert.deepEqual(Object.keys(data.activities[0]).sort(), ["id", "source", "clickedAt", "destinationUrl", "talent", "job"].sort());
    assert.deepEqual(Object.keys(data.activities[0].talent).sort(), ["id", "name", "exists"].sort());
    assert.deepEqual(Object.keys(data.activities[0].job).sort(), ["id", "title", "companyName", "exists"].sort());
  });
  await t.test("search/job filters precede deterministic bounded pagination; repeated clicks stay separate", async () => {
    const a = (await get("limit=50")).data.activities;
    assert.deepEqual(a.map(row => row.id), [...a.map(row => row.id)].sort().reverse());
    const pages = []; for (let page = 1; page <= 5; page++) pages.push(...(await get(`page=${page}&limit=5`)).data.activities);
    assert.deepEqual(pages, a); assert.equal(new Set(pages.map(row => row.id)).size, 25);
    assert.equal((await get("q=Ada&limit=1")).data.pagination.total, 24);
    assert.equal((await get("q=Recorded%20Company&limit=1")).data.pagination.total, 25);
    assert.equal((await get("q=%2E%2A")).data.pagination.total, 0);
    assert.equal((await get(`jobId=${id(10)}&limit=1`)).data.pagination.total, 25);
    assert.equal((await get(`jobId=${id(11)}`)).data.pagination.total, 0);
    assert.equal((await get("page=99")).data.activities.length, 0);
  });
  await t.test("removed Talent/job retains snapshot and unavailable fallback without Employer collision", async () => {
    assert.equal((await AdminJob.findById(id(10))).applicantsCount, 7);
    await AdminJob.collection.updateOne({ _id: id(10) }, { $set: { isDeleted: true } });
    assert((await get()).data.activities.every(row => !row.job.exists));
    await Talent.collection.deleteOne({ _id: id(4) }); await AdminJob.collection.deleteOne({ _id: id(10) });
    const rows = (await get("limit=50")).data.activities;
    assert.equal(rows.length, 25); assert(rows.every(row => row.talent.name === "Talent unavailable" && !row.talent.exists && !row.job.exists && row.job.title === "Recorded Designer" && row.destinationUrl === destination));
  });
  await t.test("invalid queries and service failure are safe; reads leave Internal data/activities unchanged", async () => {
    for (const query of ["source=employer", "talentId=x", "q=a&q=b", "page=0", "page=100001", "limit=51", "jobId=bad"]) assert.equal((await get(query)).status, 400, query);
    const mock = t.mock.method(Activity, "aggregate", () => { throw new Error("PRIVATE DATABASE ERROR"); });
    try { const result = await get(); assert.equal(result.status, 503); assert(!JSON.stringify(result.data).includes("PRIVATE")); } finally { mock.mock.restore(); }
    assert.equal(await Activity.countDocuments(), 26); assert.equal((await AdminJobApplication.findById(id(20))).status, "shortlisted"); assert.equal((await Job.findById(id(10))).applicantsCount, 8);
  });
});
