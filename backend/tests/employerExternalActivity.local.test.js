import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import applicationRoutes from "../src/routes/jobApplicationRoutes.js";
import jobRoutes from "../src/routes/jobRoutes.js";
import Activity from "../src/models/ExternalApplicationActivity.js";
import JobApplication from "../src/models/JobApplication.js";
import AdminJobApplication from "../src/models/AdminJobApplication.js";
import Talent from "../src/models/Talent.js";
import Employer from "../src/models/Employer.js";
import Admin from "../src/models/Admin.js";
import Job from "../src/models/Job.js";
import AdminJob from "../src/models/AdminJob.js";

test("Employer external figures: isolated synthetic HTTP/MongoDB", {
  skip: process.env.EMPLOYER_EXTERNAL_ACTIVITY_LOCAL_TEST !== "1",
}, async t => {
  const secret = process.env.JWT_SECRET; process.env.JWT_SECRET = "employer-figures-synthetic-only";
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
  });
  await mongoose.connect(`mongodb://127.0.0.1:27933/qnduit_employer_figures_test_${process.pid}_${Date.now()}`,
    { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const employer = { _id: id(10), companyName: "Owner", accountStatus: "active", isVerified: true };
  const other = { ...employer, _id: id(11) }, zero = { ...employer, _id: id(12) };
  const talents = [1, 2, 3, 4].map(n => ({ _id: id(n), accountStatus: "active", isVerified: true, fullName: `Talent ${n}` }));
  await Employer.collection.insertMany([employer, other, zero]); await Talent.collection.insertMany(talents);
  const admin = { _id: employer._id, isActive: true }; await Admin.collection.insertOne(admin);
  const job = (n, extra = {}) => ({ _id: id(n), employer: employer._id, jobTitle: `Job ${n}`, status: "published", isDeleted: false,
    applicationType: "external", applicationUrl: "https://example.invalid/current", deadlineDate: null, createdAt: new Date(), applicantsCount: 0, ...extra });
  await Job.collection.insertMany([job(100, { applicantsCount: 2 }), job(101), job(102, { applicationType: "internal", applicationUrl: "" }),
    job(104, { employer: other._id }), job(105, { isDeleted: true }), job(106, { employer: zero._id })]);
  await AdminJob.collection.insertOne({ _id: id(100), postedBy: admin._id, applicationType: "external", applicationUrl: "https://example.invalid/admin" });
  await JobApplication.collection.insertMany([
    { _id: id(200), jobId: id(100), applicantId: id(1), employerId: employer._id, status: "reviewed", createdAt: new Date(), appliedAt: new Date() },
    { _id: id(201), jobId: id(100), applicantId: id(2), employerId: employer._id, status: "pending", employerArchivedAt: new Date(), createdAt: new Date() },
    { _id: id(202), jobId: id(104), applicantId: id(1), employerId: other._id, status: "reviewed", createdAt: new Date() },
  ]);
  await AdminJobApplication.collection.insertOne({ _id: id(200), jobId: id(100), applicantId: id(1), postedBy: admin._id, status: "reviewed" });
  let sequence = 0;
  const event = (jobId, talentId, extra = {}) => ({ _id: `event-${++sequence}`, intentId: `intent-${sequence}`, talentId: id(talentId), jobId: id(jobId),
    source: "employer", posterId: employer._id, posterType: "Employer", clickedAt: new Date(),
    destinationUrl: "https://example.invalid/recorded-private?token=EXACT%2B#part", display: { jobTitle: "Recorded private snapshot" }, ...extra });
  await Activity.collection.insertMany([
    event(100, 1), event(100, 1), event(100, 1), event(100, 2), event(101, 1), event(101, 3),
    event(103, 2), event(103, 3), event(103, 3), event(105, 1),
    event(100, 3, { posterId: other._id }),
    event(100, 3, { source: "admin", posterType: "Admin" }),
    event(100, 3, { posterType: "Admin" }), event(100, 3, { source: "admin" }),
  ]);
  const app = express(); app.use(express.json());
  app.use("/api/applications", applicationRoutes); app.use("/api/jobs", jobRoutes);
  app.use((error, req, res, next) => { void next; res.status(503).json({ success: false, message: "Synthetic service failure" }); });
  server = await new Promise(resolve => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  const token = (user = employer, role = "employer") => jwt.sign({ id: String(user._id), role }, process.env.JWT_SECRET);
  const get = async (path, auth = token()) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
    return { status: res.status, cache: res.headers.get("cache-control"), data: await res.json() };
  };
  const summary = (auth = token()) => get("applications/employer?summaryOnly=true", auth);
  const initialEvents = await Activity.find().sort({ _id: 1 }).lean();

  await t.test("authenticated Employer only, source restrictions and suspended-account checks", async () => {
    for (const path of ["jobs/my-jobs", "applications/employer?summaryOnly=true"]) {
      assert.equal((await get(path, "")).status, 401);
      assert.equal((await get(path, token(talents[0], "talent"))).status, 403);
      assert.equal((await get(path, token(admin, "admin"))).status, 403);
      assert.equal((await get(path + (path.includes("?") ? "&" : "?") + "source=admin")).status, 400);
    }
    await Employer.collection.updateOne({ _id: employer._id }, { $set: { accountStatus: "suspended" } });
    assert.equal((await summary()).status, 403);
    await Employer.collection.updateOne({ _id: employer._id }, { $set: { accountStatus: "active" } });
  });
  await t.test("one batched per-job aggregation, distinct Talents and all events, zero defaults", async () => {
    const original = Activity.aggregate;
    let calls = 0;
    const mock = t.mock.method(Activity, "aggregate", function (...args) { calls++; return original.apply(this, args); });
    try {
      const { data, status, cache } = await get("jobs/my-jobs");
      assert.equal(status, 200); assert.equal(cache, "private, no-store"); assert.equal(calls, 1);
      assert.equal(data.jobs.length, 3);
      const byId = new Map(data.jobs.map(row => [row._id, row]));
      assert.deepEqual([byId.get(String(id(100))).externalTalents, byId.get(String(id(100))).externalClicks], [2, 4]);
      assert.deepEqual([byId.get(String(id(101))).externalTalents, byId.get(String(id(101))).externalClicks], [2, 2]);
      assert.deepEqual([byId.get(String(id(102))).externalTalents, byId.get(String(id(102))).externalClicks], [0, 0]);
      assert.equal(byId.get(String(id(100))).applicantsCount, 2);
      assert(!JSON.stringify(data).includes("recorded-private")); assert(!JSON.stringify(data).includes("talentId"));
    } finally { mock.mock.restore(); }
  });
  await t.test("dashboard distinct is global, includes hard/soft removed jobs, Internal totals remain separate", async () => {
    const { data, cache } = await summary();
    assert.equal(cache, "private, no-store");
    assert.equal(data.externalTalents, 3); assert.equal(data.externalClicks, 10);
    assert.equal(data.totalApplications, 2); assert.equal(data.reviewedApplications, 1);
    assert.deepEqual(data.applications, []);
    assert(!JSON.stringify(data).includes("recorded-private")); assert(!JSON.stringify(data).includes("talentId"));
    const list = (await get("applications/employer?page=1&limit=20")).data;
    assert.equal(list.totalApplications, 2); assert.equal(list.applications.length, 1);
    assert.equal(list.applications[0].status, "reviewed"); assert.equal(list.externalClicks, undefined);
    assert.equal((await get("applications/my-applications", token(talents[0], "talent"))).data.applications.length, 3);
  });
  await t.test("owner, posterType and source cannot collide or be overridden", async () => {
    const foreign = (await summary(token(other))).data;
    assert.equal(foreign.externalTalents, 1); assert.equal(foreign.externalClicks, 1);
    const spoofed = (await get(`applications/employer?summaryOnly=true&posterId=${other._id}&employerId=${other._id}&posterType=Admin`)).data;
    assert.equal(spoofed.externalTalents, 3); assert.equal(spoofed.externalClicks, 10);
    assert.equal((await get(`jobs/my-jobs?posterId=${other._id}`)).data.jobs.length, 3);
    const empty = (await summary(token(zero))).data;
    assert.equal(empty.externalTalents, 0); assert.equal(empty.externalClicks, 0);
    const emptyJob = (await get("jobs/my-jobs", token(zero))).data.jobs[0];
    assert.equal(emptyJob.externalTalents, 0); assert.equal(emptyJob.externalClicks, 0);
  });
  await t.test("fresh activity updates figures without changing Internal counts or existing events", async () => {
    assert.deepEqual(await Activity.find().sort({ _id: 1 }).lean(), initialEvents);
    const repeat = event(100, 1); await Activity.collection.insertOne(repeat);
    assert.equal((await summary()).data.externalClicks, 11); assert.equal((await summary()).data.externalTalents, 3);
    let row = (await get("jobs/my-jobs")).data.jobs.find(job => job._id === String(id(100)));
    assert.equal(row.externalClicks, 5); assert.equal(row.externalTalents, 2); assert.equal(row.applicantsCount, 2);
    // A new Talent for job A already exists elsewhere in the owner's history.
    const crossJob = event(100, 3); await Activity.collection.insertOne(crossJob);
    row = (await get("jobs/my-jobs")).data.jobs.find(job => job._id === String(id(100)));
    assert.equal(row.externalTalents, 3); assert.equal(row.externalClicks, 6);
    assert.equal((await summary()).data.externalTalents, 3); assert.equal((await summary()).data.externalClicks, 12);
    const result = (await summary()).data; assert.equal(result.totalApplications, 2); assert.equal(result.reviewedApplications, 1);
    assert.equal(await Activity.countDocuments(), initialEvents.length + 2);
    const firstOwnerVisit = event(100, 4); await Activity.collection.insertOne(firstOwnerVisit);
    assert.equal((await summary()).data.externalTalents, 4); assert.equal((await summary()).data.externalClicks, 13);
    assert.deepEqual(await Activity.find({ _id: { $nin: [repeat._id, crossJob._id, firstOwnerVisit._id] } }).sort({ _id: 1 }).lean(), initialEvents);
  });
  await t.test("aggregate failures never return authoritative zero or partial figures", async () => {
    const mock = t.mock.method(Activity, "aggregate", () => { throw new Error("Synthetic failure"); });
    try { assert.equal((await summary()).status, 500); assert.equal((await get("jobs/my-jobs")).status, 503); }
    finally { mock.mock.restore(); }
  });
});
