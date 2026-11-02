import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import profileRoutes from "../src/routes/profileRoutes.js";
import Employer from "../src/models/Employer.js";
import Talent from "../src/models/Talent.js";
import Job from "../src/models/Job.js";
import AdminJob from "../src/models/AdminJob.js";
import Admin from "../src/models/Admin.js";
import { openJobFilter } from "../src/services/jobVisibility.js";

// Explicit opt-in; fixed loopback MongoDB only. No application startup, .env,
// provider integrations or production configuration is loaded.
test("Employer profile recent jobs: isolated local synthetic HTTP/MongoDB", {
  skip: process.env.QNDUIT_EN493D_LOCAL_TEST !== "1",
}, async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "en493d-local-synthetic-test-secret";
  const database = `qnduit_en493d_test_${process.pid}_${Date.now()}`;
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await mongoose.connect(`mongodb://127.0.0.1:27933/${database}`, {
    autoIndex: false, serverSelectionTimeoutMS: 3000,
  });
  // Late UTC evening is already the following calendar day in Lagos.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-01T23:30:00Z") });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const employerA = { _id: id(1), companyName: "Identical Company", isVerified: true,
    accountStatus: "active", showProfile: "visible", logo: { url: "", public_id: "private-logo" },
    email: "private@example.invalid", password: "must-not-leak" };
  const employerB = { ...employerA, _id: id(2) };
  const viewer = { _id: id(3), isVerified: true, accountStatus: "active" };
  await Employer.collection.insertMany([employerA, employerB]);
  await Talent.collection.insertOne(viewer);
  const admin = { _id: id(4), isActive: true };
  await Admin.collection.insertOne(admin);
  const token = (user = viewer, role = "talent") => jwt.sign({ id: String(user._id), role }, process.env.JWT_SECRET);
  const app = express();
  app.use(express.json());
  app.use("/api/profiles", profileRoutes);
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.on("error", reject);
  });
  const request = async (path = `employer/${employerA._id}/jobs`, auth = token()) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/profiles/${path}`, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    });
    return { status: response.status, cache: response.headers.get("cache-control"), data: await response.json() };
  };
  const job = (n, extra = {}) => ({ _id: id(n), employer: employerA._id,
    jobTitle: `Synthetic job ${n}`, location: "Lagos", workType: "Remote", jobApplyType: "Contract",
    createdAt: new Date("2026-10-30T10:00:00Z"), status: "published", isDeleted: false,
    applicationType: "internal", applicationUrl: "", ...extra });

  await t.test("authentication, viewer verification and suspended viewer denial", async () => {
    assert.equal((await request(undefined, "")).status, 401);
    assert.equal((await request(undefined, "invalid-token")).status, 401);
    const expired = jwt.sign({ id: String(viewer._id), role: "talent", exp: 1 }, process.env.JWT_SECRET);
    assert.equal((await request(undefined, expired)).status, 401);
    assert.equal((await request(undefined, token(admin, "admin"))).status, 403);
    await Talent.collection.updateOne({ _id: viewer._id }, { $set: { isVerified: false } });
    assert.equal((await request()).status, 403);
    await Talent.collection.updateOne({ _id: viewer._id }, { $set: { isVerified: true, accountStatus: "suspended" } });
    assert.equal((await request()).status, 403);
    await Talent.collection.updateOne({ _id: viewer._id }, { $set: { accountStatus: "active" } });
  });
  await t.test("target validation and existing profile visibility including self exception", async () => {
    assert.equal((await request("employer/not-an-id/jobs")).status, 400);
    assert.equal((await request(`unknown/${employerA._id}/jobs`)).status, 400);
    assert.equal((await request(`talent/${viewer._id}/jobs`)).status, 400);
    assert.equal((await request(`employer/${id(999)}/jobs`)).status, 404);
    for (const fields of [{ showProfile: "hidden" }, { accountStatus: "suspended" }, { isVerified: false }]) {
      await Employer.collection.updateOne({ _id: employerA._id }, { $set: fields });
      assert.equal((await request()).status, 404);
      await Employer.collection.updateOne({ _id: employerA._id }, { $set: {
        showProfile: "visible", accountStatus: "active", isVerified: true,
      } });
    }
    await Employer.collection.updateOne({ _id: employerA._id }, { $set: { showProfile: "hidden" } });
    assert.equal((await request(undefined, token(employerA, "employer"))).status, 200);
    await Employer.collection.updateOne({ _id: employerA._id }, { $set: { showProfile: "visible" } });
  });
  await t.test("denied profiles never query jobs", async () => {
    const query = t.mock.method(Job, "find", () => { throw new Error("Jobs must not be queried"); });
    await Employer.collection.updateOne({ _id: employerA._id }, { $set: { showProfile: "hidden" } });
    try {
      assert.equal((await request()).status, 404);
      assert.equal(query.mock.callCount(), 0);
    } finally {
      query.mock.restore();
      await Employer.collection.updateOne({ _id: employerA._id }, { $set: { showProfile: "visible" } });
    }
  });
  await t.test("exact ownership, identical names, no Admin union, empty state and no view writes", async () => {
    await Job.collection.insertMany([job(10), job(11, { employer: employerB._id })]);
    await AdminJob.collection.insertOne(job(12, { organization: employerA.companyName }));
    const result = await request();
    assert.equal(result.status, 200);
    assert.equal(result.cache, "private, no-store");
    assert.deepEqual(result.data.jobs.map(row => row._id), [String(id(10))]);
    const other = await request(`employer/${employerB._id}/jobs`);
    assert.deepEqual(other.data.jobs.map(row => row._id), [String(id(11))]);
    await Job.collection.deleteMany({});
    assert.deepEqual((await request()).data, { success: true, jobs: [] });
    assert.equal(await mongoose.connection.collection("profileviews").countDocuments(), 0);
  });
  await t.test("published/nondeleted/deadline boundaries retain shared discovery semantics", async () => {
    assert.equal(openJobFilter().$or[2].deadlineDate.$gte.toISOString(), "2026-11-02T00:00:00.000Z");
    const legacy = job(25); delete legacy.isDeleted;
    await Job.collection.insertMany([
      job(20), job(21, { deadlineDate: null }),
      job(22, { deadlineDate: new Date("2026-11-02T00:00:00Z") }),
      job(23, { deadlineDate: new Date("2026-11-03T00:00:00Z") }),
      job(24, { deadlineDate: new Date("2026-11-01T23:59:59.999Z") }), legacy,
      job(26, { status: "draft" }), job(27, { status: "closed" }), job(28, { isDeleted: true }),
      job(29, { isDeleted: null }), job(30, { flagged: true }),
    ]);
    assert.deepEqual((await request()).data.jobs.map(row => row._id), [30, 23, 22, 21, 20].map(n => String(id(n))));
    await Job.collection.deleteMany({});
  });
  await t.test("six newest jobs with descending ID tie-break, independent of client parameters", async () => {
    await Job.collection.insertMany(Array.from({ length: 9 }, (_, i) => job(40 + i, {
      createdAt: new Date(i < 2 ? "2026-11-01T10:00:00Z" : "2026-10-30T10:00:00Z"),
    })));
    const result = await request(`employer/${employerA._id}/jobs?limit=100&employer=${employerB._id}&sort=oldest`);
    assert.deepEqual(result.data.jobs.map(row => row._id), [41, 40, 48, 47, 46, 45].map(n => String(id(n))));
    await Job.collection.deleteMany({});
  });
  await t.test("explicit allowlist, Employer source and Internal/External metadata", async () => {
    await Job.collection.insertMany([
      job(60, { source: "admin", secret: "private", jobDescription: "private description",
        featuredImage: { url: "https://example.invalid/job.png", public_id: "private-image" },
        applicationType: "external", applicationUrl: "https://example.invalid/apply?ref=a%2Bb" }),
      job(61, { applicationType: "external", applicationUrl: "javascript:alert(1)" }),
      job(62, { applicationType: "unknown" }),
      job(63, { applicationType: null }),
    ]);
    const rows = (await request()).data.jobs;
    const external = rows.find(row => row._id === String(id(60)));
    assert.deepEqual(Object.keys(external).sort(), ["_id", "source", "employer", "jobTitle", "location",
      "workType", "jobApplyType", "createdAt", "status", "isDeleted", "deadlineDate",
      "featuredImage", "applicationType", "applicationUrl"].sort());
    assert.deepEqual(external.employer, { _id: String(employerA._id), companyName: employerA.companyName, logo: { url: "" } });
    assert.deepEqual(external.featuredImage, { url: "https://example.invalid/job.png" });
    assert.equal(external.workType, "Remote");
    assert.equal(external.jobApplyType, "Contract");
    assert.equal(external.applicationUrl, "https://example.invalid/apply?ref=a%2Bb");
    assert(rows.every(row => row.source === "employer"));
    assert.equal(rows.find(row => row._id === String(id(61))).applicationUrl, "");
    assert.equal(rows.find(row => row._id === String(id(62))).applicationType, "unknown");
    assert.equal(rows.find(row => row._id === String(id(63))).applicationType, "internal");
  });
});
