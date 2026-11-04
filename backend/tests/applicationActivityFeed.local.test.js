import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import applicationRoutes from "../src/routes/jobApplicationRoutes.js";
import JobApplication from "../src/models/JobApplication.js";
import AdminJobApplication from "../src/models/AdminJobApplication.js";
import Activity from "../src/models/ExternalApplicationActivity.js";
import Talent from "../src/models/Talent.js";
import Employer from "../src/models/Employer.js";
import Admin from "../src/models/Admin.js";
import Job from "../src/models/Job.js";
import AdminJob from "../src/models/AdminJob.js";

test("Combined application activity feed: isolated synthetic HTTP/MongoDB", {
  skip: process.env.APPLICATION_FEED_LOCAL_TEST !== "1",
}, async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "application-feed-synthetic-local-only";
  const database = `qnduit_activity_feed_test_${process.pid}_${Date.now()}`;
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  });
  await mongoose.connect(`mongodb://127.0.0.1:27933/${database}`, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const talent = { _id: id(1), isVerified: true, accountStatus: "active" };
  const other = { ...talent, _id: id(2) }, empty = { ...talent, _id: id(3) };
  const employer = { _id: id(4), companyName: "Identical Company", accountStatus: "active", isVerified: true };
  const admin = { _id: id(5), isActive: true };
  await Talent.collection.insertMany([talent, other, empty]);
  await Employer.collection.insertOne(employer); await Admin.collection.insertOne(admin);
  await Job.collection.insertOne({ _id: id(10), employer: employer._id, jobTitle: "Internal Employer Designer",
    location: "Lagos", category: "Design", workType: "Hybrid", jobApplyType: "Contract", status: "published", isDeleted: false,
    applicationType: "internal", applicantsCount: 9, jobDescription: "do-not-return", privateField: "secret" });
  await AdminJob.collection.insertOne({ _id: id(10), postedBy: admin._id, organization: "Admin Publisher", jobTitle: "Internal Admin Engineer",
    status: "published", isDeleted: false, applicationType: "internal", applicantsCount: 8 });
  const timestamp = n => new Date(Date.UTC(2026, 10, 2, 10, n));
  // Identical application IDs across collections must remain distinct rows.
  await JobApplication.collection.insertMany([
    { _id: id(100), applicantId: talent._id, employerId: employer._id, jobId: id(10), status: "shortlisted", appliedAt: timestamp(2), createdAt: timestamp(1), notificationOutbox: [{ secret: true }] },
    { _id: id(101), applicantId: talent._id, employerId: employer._id, jobId: id(999), status: "rejected", createdAt: timestamp(0) },
    { _id: id(102), applicantId: other._id, employerId: employer._id, jobId: id(10), status: "hired", appliedAt: timestamp(59) },
  ]);
  await AdminJobApplication.collection.insertMany([
    { _id: id(100), applicantId: talent._id, postedBy: admin._id, jobId: id(10), status: "reviewed", appliedAt: timestamp(2), createdAt: timestamp(1) },
    { _id: id(103), applicantId: other._id, postedBy: admin._id, jobId: id(10), status: "pending", appliedAt: timestamp(59) },
  ]);
  const destination = "https://example.invalid/apply?ref=a%2Bb&ref=a+b&empty=#part";
  const external = (n, extra = {}) => ({ _id: `intent-${n}`, talentId: talent._id, intentId: `intent-${n}`,
    jobId: id(10), source: n % 2 ? "admin" : "employer", posterId: n % 2 ? admin._id : employer._id,
    destinationUrl: destination, clickedAt: timestamp(n < 3 ? 2 : n),
    display: { jobTitle: "Snapshot External Designer", companyName: "Original Company", location: "Abuja", category: "Design", workType: "Remote", jobApplyType: "Contract", privateField: "hidden" }, ...extra });
  await Activity.collection.insertMany(Array.from({ length: 25 }, (_, n) => external(n)));
  await Activity.collection.insertOne(external(50, { talentId: other._id, display: { jobTitle: "SECRET OTHER TALENT" } }));
  const app = express(); app.use(express.json()); app.use("/api/applications", applicationRoutes);
  server = await new Promise((resolve, reject) => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); value.on("error", reject); });
  const base = `http://127.0.0.1:${server.address().port}/api/applications`;
  const token = (user = talent, role = "talent") => jwt.sign({ id: String(user._id), role }, process.env.JWT_SECRET);
  const get = async (query = "", auth = token(), route = "activity-feed") => {
    const response = await fetch(`${base}/${route}${query ? "?" + query : ""}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });
    return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
  };

  await t.test("authentication, role checks and owner isolation across all three collections", async () => {
    assert.equal((await get("", "")).status, 401);
    assert.equal((await get("", "invalid")).status, 401);
    assert.equal((await get("", token(employer, "employer"))).status, 403);
    assert.equal((await get("", token(admin, "admin"))).status, 403);
    const result = await get(); assert.equal(result.status, 200); assert.equal(result.cache, "private, no-store");
    assert.equal(result.data.pagination.total, 5);
    assert.equal(JSON.stringify(result.data).includes("SECRET OTHER TALENT"), false);
    assert.equal((await get("", token(other))).data.pagination.total, 3);
    assert.deepEqual((await get("", token(empty))).data.activities, []);
    assert.equal((await get("talentId=" + other._id)).status, 400);
    await Talent.collection.updateOne({ _id: talent._id }, { $set: { accountStatus: "suspended" } });
    assert.equal((await get()).status, 403);
    await Talent.collection.updateOne({ _id: talent._id }, { $set: { accountStatus: "active" } });
  });
  await t.test("mixed ordering and pagination are global and deterministic, including tied timestamps and source collisions", async () => {
    const all = (await get("limit=50")).data.activities;
    assert.equal(all.length, 5); assert.equal(new Set(all.map(row => row.id)).size, 5);
    assert(all.some(row => row.id === `internal:employer:${id(100)}`));
    assert(all.some(row => row.id === `internal:admin:${id(100)}`));
    const sorted = [...all].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
    assert.deepEqual(all.map(row => row.id), sorted.map(row => row.id));
    const pages = [];
    for (let page = 1; page <= 3; page++) pages.push(...(await get(`page=${page}&limit=2`)).data.activities);
    assert.deepEqual(pages.map(row => row.id), all.map(row => row.id));
    assert.deepEqual((await get("page=99&limit=5")).data.activities, []);
  });
  await t.test("type/source/search filters run before pagination with accurate totals", async () => {
    const internal = await get("type=internal&source=all&limit=1");
    assert.equal(internal.data.pagination.total, 3); assert.equal(internal.data.activities.length, 1);
    assert.equal((await get("type=internal&source=admin")).data.pagination.total, 1);
    assert.equal((await get("type=external&source=admin")).data.pagination.total, 1);
    assert.equal((await get("type=external&source=employer")).data.pagination.total, 1);
    assert.equal((await get("q=shortlisted&limit=1")).data.pagination.total, 1);
    assert.equal((await get("q=Internal%20Admin&limit=1")).data.activities[0].source, "admin");
    assert.equal((await get("q=Original%20Company&type=external&limit=1")).data.pagination.total, 2);
    assert.equal((await get("q=ref%3Da%252Bb&limit=1")).data.pagination.total, 2);
    assert.equal((await get("q=%2E%2A")).data.pagination.total, 0, "Regex input must be literal");
    assert.equal((await get("q=no-match")).data.pagination.total, 0);
  });
  await t.test("latest complete event wins ties; stable groups retain lifetime opens and search only their latest snapshot", async () => {
    const original = (await get("type=external&source=employer")).data.activities[0];
    assert.equal(original.id, `external:employer:${id(10)}`);
    assert.equal(original.totalOpens, 13);
    assert.equal(original.occurredAt, timestamp(24).toISOString());
    const newerDestination = "https://example.invalid/new?x=%2F&x=+&empty=#latest";
    const newest = external(60, { _id: "tie-z", clickedAt: timestamp(24), destinationUrl: newerDestination,
      display: { jobTitle: "LATEST Complete Snapshot", companyName: "Latest Publisher", location: "Kano", category: "Engineering", workType: "On-site", jobApplyType: "Full Time" } });
    const tied = external(62, { _id: "tie-a", clickedAt: timestamp(24), destinationUrl: "https://example.invalid/loser", display: { jobTitle: "TIE LOSER" } });
    const older = external(64, { _id: "zzz-older", clickedAt: timestamp(1), display: { jobTitle: "OLD SNAPSHOT ONLY" } });
    const eventsBefore = await Activity.find().sort({ _id: 1 }).lean();
    const internalBefore = (await get("type=internal")).data;
    try {
      await Activity.collection.insertMany([newest, tied, older]);
      const row = (await get("type=external&source=employer")).data.activities[0];
      assert.equal(row.id, original.id);
      assert.equal(row.totalOpens, 16);
      assert.equal(row.occurredAt, newest.clickedAt.toISOString());
      assert.deepEqual(row.display, newest.display);
      assert.equal(row.destinationUrl, newerDestination);
      for (const q of ["OLD SNAPSHOT ONLY", "TIE LOSER", "loser", "Original Company", "ref=a%2Bb"]) {
        assert.equal((await get(`type=external&source=employer&q=${encodeURIComponent(q)}`)).data.pagination.total, 0, q);
      }
      for (const q of ["LATEST Complete", "Latest Publisher", "Kano", "Engineering", "On-site", "x=%2F"]) {
        const result = (await get(`type=external&source=employer&limit=1&q=${encodeURIComponent(q)}`)).data;
        assert.equal(result.pagination.total, 1, q); assert.equal(result.activities[0].totalOpens, 16);
      }
      assert.deepEqual((await get("type=internal")).data, internalBefore);
      assert.equal(await Activity.countDocuments(), eventsBefore.length + 3);
      const addedBefore = await Activity.find({ _id: { $in: [newest._id, tied._id, older._id] } }).sort({ _id: 1 }).lean();
      await get("type=external&limit=1"); await get("type=external&page=2&limit=1");
      assert.deepEqual(await Activity.find({ _id: { $in: addedBefore.map(row => row._id) } }).sort({ _id: 1 }).lean(), addedBefore);
    } finally { await Activity.deleteMany({ _id: { $in: [newest._id, tied._id, older._id] } }); }
    assert.deepEqual(await Activity.find().sort({ _id: 1 }).lean(), eventsBefore);
  });
  await t.test("external grouped snapshots, repeated opens and exact destinations survive job edits and removal", async () => {
    const before = (await get("type=external&limit=50")).data.activities;
    assert.equal(before.length, 2); assert.deepEqual(before.map(row => row.totalOpens).sort((a, b) => a - b), [12, 13]); assert(before.every(row => row.destinationUrl === destination && row.status === null));
    await Job.collection.updateOne({ _id: id(10) }, { $set: { jobTitle: "Renamed role", status: "closed", isDeleted: true, applicationUrl: "https://example.invalid/new" } });
    await AdminJob.collection.deleteOne({ _id: id(10) });
    await Employer.collection.updateOne({ _id: employer._id }, { $set: { companyName: "Renamed Company" } });
    const after = (await get("type=external&limit=50")).data.activities;
    assert.deepEqual(after.map(row => [row.id, row.display, row.destinationUrl, row.occurredAt]), before.map(row => [row.id, row.display, row.destinationUrl, row.occurredAt]));
    assert(after.filter(row => row.source === "admin").every(row => row.jobExists === false));
    assert(after.filter(row => row.source === "employer").every(row => row.jobExists === true));
    assert.equal((await get("q=Renamed%20role&type=external")).data.pagination.total, 0);
    const removedInternal = (await get("type=internal&source=admin")).data.activities[0];
    assert.equal(removedInternal.display.jobTitle, "Job no longer available"); assert.equal(removedInternal.status, "reviewed");
  });
  await t.test("explicit output allowlist and unchanged legacy history/internal status semantics", async () => {
    const rows = (await get("limit=50")).data.activities;
    assert.deepEqual(Object.keys(rows.find(row => row.kind === "internal")).sort(), ["id", "kind", "source", "label", "jobId", "jobExists", "occurredAt", "status", "destinationUrl", "imageUrl", "display"].sort());
    assert.deepEqual(Object.keys(rows.find(row => row.kind === "external")).sort(), ["id", "kind", "source", "label", "jobId", "jobExists", "occurredAt", "status", "destinationUrl", "imageUrl", "display", "totalOpens"].sort());
    assert(!JSON.stringify(rows).includes("do-not-return")); assert(!JSON.stringify(rows).includes("privateField"));
    assert(rows.filter(row => row.kind === "external").every(row => row.label === "External Application"));
    const old = await get("", token(), "my-applications");
    assert.equal(old.data.applications.length, 3); assert(old.data.applications.every(row => row.status));
    assert(!old.data.applications.some(row => row.kind === "external"));
    assert.equal((await Job.findById(id(10)).lean()).applicantsCount, 9);
    assert.equal(await Activity.countDocuments({ talentId: talent._id }), 25);
    assert.equal(await mongoose.connection.collection("notifications").countDocuments(), 0);
  });
  await t.test("invalid filters/pagination fail safely; service errors do not yield partial history", async () => {
    for (const query of ["page=0", "page=-1", "page=1.5", "limit=0", "limit=51", "page=100001", "type=unknown", "source=unknown", "q=a&q=b", "limit=5&limit=10", "q=" + "x".repeat(201)]) {
      assert.equal((await get(query)).status, 400, query);
    }
    const mock = t.mock.method(JobApplication, "aggregate", () => { throw new Error("Synthetic DB failure"); });
    try { const result = await get(); assert.equal(result.status, 503); assert(!JSON.stringify(result.data).includes("Synthetic DB")); }
    finally { mock.mock.restore(); }
  });
  await t.test("Talent dashboard summary is owner-only, source-aware, private and separate from Internal history", async () => {
    const summary = await get("summaryOnly=true", token(), "my-applications");
    assert.equal(summary.cache, "private, no-store");
    assert.deepEqual(summary.data, { success: true, totalApplications: 3, externalJobGroups: 2, externalOpens: 25 });
    assert.deepEqual((await get("summaryOnly=true", token(other), "my-applications")).data,
      { success: true, totalApplications: 2, externalJobGroups: 1, externalOpens: 1 });
    assert.deepEqual((await get("summaryOnly=true", token(empty), "my-applications")).data,
      { success: true, totalApplications: 0, externalJobGroups: 0, externalOpens: 0 });
    assert.equal((await get("summaryOnly=true", "", "my-applications")).status, 401);
    assert.equal((await get("summaryOnly=true", token(employer, "employer"), "my-applications")).status, 403);
    assert.equal((await get("summaryOnly=true&talentId=" + other._id, token(), "my-applications")).data.externalOpens, 25);
    assert.equal((await get("summaryOnly=bad", token(), "my-applications")).status, 400);
    assert.equal((await get("summaryOnly=true&summaryOnly=false", token(), "my-applications")).status, 400);
    const before = await Activity.find().sort({ _id: 1 }).lean();
    const internal = (await get("", token(), "my-applications")).data.applications.map(row => [row._id, row.source, row.status]);
    const newGroup = external(70, { _id: "summary-new-group", jobId: id(999), source: "admin" });
    const repeat = external(72, { _id: "summary-repeat", jobId: id(999), source: "admin" });
    try {
      await Activity.collection.insertOne(newGroup);
      assert.deepEqual((await get("summaryOnly=true", token(), "my-applications")).data,
        { success: true, totalApplications: 3, externalJobGroups: 3, externalOpens: 26 });
      await Activity.collection.insertOne(repeat);
      assert.equal((await get("summaryOnly=true", token(), "my-applications")).data.externalJobGroups, 3);
      assert.equal((await get("summaryOnly=true", token(), "my-applications")).data.externalOpens, 27);
      assert.deepEqual((await get("", token(), "my-applications")).data.applications.map(row => [row._id, row.source, row.status]), internal);
    } finally { await Activity.deleteMany({ _id: { $in: [newGroup._id, repeat._id] } }); }
    assert.deepEqual(await Activity.find().sort({ _id: 1 }).lean(), before);
    const mock = t.mock.method(Activity, "aggregate", () => { throw Error("PRIVATE_FAILURE"); });
    try {
      const failure = await get("summaryOnly=true", token(), "my-applications");
      assert.equal(failure.status, 503); assert(!JSON.stringify(failure.data).includes("PRIVATE_FAILURE"));
    } finally { mock.mock.restore(); }
  });
  await t.test("external-only and completely empty installations tolerate absent history collections", async () => {
    await JobApplication.collection.drop(); await AdminJobApplication.collection.drop();
    const externalOnly = await get("limit=50");
    assert.equal(externalOnly.status, 200); assert.equal(externalOnly.data.pagination.total, 2);
    assert(externalOnly.data.activities.every(row => row.kind === "external"));
    await Activity.collection.drop();
    const none = await get(); assert.equal(none.status, 200); assert.equal(none.data.pagination.total, 0);
    assert.deepEqual(none.data.activities, []);
    assert.deepEqual((await get("summaryOnly=true", token(), "my-applications")).data,
      { success: true, totalApplications: 0, externalJobGroups: 0, externalOpens: 0 });
  });
});
