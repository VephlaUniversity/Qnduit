import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import process from "node:process";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import applicationRoutes from "../src/routes/jobApplicationRoutes.js";
import Activity, { EXTERNAL_ACTIVITY_INTENT_INDEX } from "../src/models/ExternalApplicationActivity.js";
import Talent from "../src/models/Talent.js";
import Employer from "../src/models/Employer.js";
import Admin from "../src/models/Admin.js";
import Job from "../src/models/Job.js";
import AdminJob from "../src/models/AdminJob.js";

test("External application activity: isolated synthetic HTTP/MongoDB", {
  skip: process.env.EXTERNAL_ACTIVITY_LOCAL_TEST !== "1",
}, async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "external-activity-local-test-only-secret";
  const database = `qnduit_external_activity_test_${process.pid}_${Date.now()}`;
  const uri = `mongodb://127.0.0.1:27933/${database}`;
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-01T23:30:00Z") });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  const talent = { _id: id(1), isVerified: true, accountStatus: "active" };
  const otherTalent = { ...talent, _id: id(2) };
  const employer = { _id: id(3), companyName: "Synthetic Company", isVerified: true, accountStatus: "active", privateContact: "do-not-leak" };
  const otherEmployer = { ...employer, _id: id(4) }; // Deliberately identical name.
  const admin = { _id: id(5), isActive: true };
  await Talent.collection.insertMany([talent, otherTalent]);
  await Employer.collection.insertMany([employer, otherEmployer]);
  await Admin.collection.insertOne(admin);
  const destination = "https://example.invalid/apply?ref=a%2Bb&ref=a+b&empty=&case=%2f#section";
  const job = (n, extra = {}) => ({ _id: id(n), employer: employer._id, jobTitle: `Synthetic External ${n}`,
    location: "Lagos", category: "Design", workType: "Remote", jobApplyType: "Contract",
    status: "published", isDeleted: false, applicationType: "external", applicationUrl: destination,
    deadlineDate: null, applicantsCount: 7, jobDescription: "private-description", secret: "must-not-leak", ...extra });
  await Job.collection.insertMany([job(10), job(11, { employer: otherEmployer._id })]);
  // Same ID exists in both collections; explicit source must pick exactly one.
  await AdminJob.collection.insertOne(job(10, { employer: undefined, postedBy: admin._id, organization: "Synthetic Admin Publisher" }));
  let loseAcknowledgement = false;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (loseAcknowledgement && req.path === "/api/applications/external-activities") {
      const send = res.json.bind(res);
      res.json = data => {
        if (data.success) { loseAcknowledgement = false; res.destroy(); return res; }
        return send(data);
      };
    }
    next();
  });
  app.use("/api/applications", applicationRoutes);
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.on("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}/api/applications`;
  const token = (user = talent, role = "talent") => jwt.sign({ id: String(user._id), role }, process.env.JWT_SECRET);
  const payload = (extra = {}) => ({ jobId: String(id(10)), source: "employer", expectedDestination: destination, intentId: randomUUID(), ...extra });
  const post = async (body, auth = token()) => {
    const response = await fetch(`${base}/external-activities`, { method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const provision = async () => {
    const { stdout } = await promisify(execFile)(process.execPath, ["src/scripts/provisionExternalApplicationActivity.js"], {
      cwd: new URL("../", import.meta.url), env: { ...process.env, EXTERNAL_ACTIVITY_DATABASE_URI: uri },
    });
    assert.match(stdout, /provisioned and verified/);
  };

  await t.test("missing collection/protection fails closed; explicit provisioning is repeatable", async () => {
    const result = await post(payload());
    assert.equal(result.status, 503);
    assert.equal(result.data.code, "EXTERNAL_ACTIVITY_NOT_READY");
    assert(!(await mongoose.connection.db.listCollections({ name: Activity.collection.name }).toArray()).length);
    await provision(); await provision();
    assert.equal(await Activity.countDocuments(), 0);
    const indexes = await Activity.collection.listIndexes().toArray();
    assert(indexes.some(row => row.name === EXTERNAL_ACTIVITY_INTENT_INDEX && row.unique));
  });
  await t.test("authentication, Talent authorization, suspension and spoofed identity rejection", async () => {
    assert.equal((await post(payload(), "")).status, 401);
    assert.equal((await post(payload(), "invalid")).status, 401);
    assert.equal((await post(payload(), token(employer, "employer"))).status, 403);
    assert.equal((await post(payload(), token(admin, "admin"))).status, 403);
    await Talent.collection.updateOne({ _id: talent._id }, { $set: { accountStatus: "suspended" } });
    assert.equal((await post(payload())).status, 403);
    await Talent.collection.updateOne({ _id: talent._id }, { $set: { accountStatus: "active" } });
    for (const fields of [{ talentId: String(otherTalent._id) }, { posterId: String(otherEmployer._id) }, { clickedAt: "2000-01-01" }]) {
      assert.equal((await post(payload(fields))).status, 400);
    }
    assert.equal(await Activity.countDocuments(), 0);
  });
  await t.test("strict locator/intent validation and no source fallback", async () => {
    for (const change of [{ source: "unknown" }, { source: undefined }, { jobId: "bad" }, { intentId: "not-a-uuid" },
      { expectedDestination: "javascript:alert(1)" }, { expectedDestination: "https://user:pass@example.invalid" }]) {
      assert.equal((await post(payload(change))).status, 400);
    }
    assert.equal((await post(payload({ jobId: String(id(11)), source: "admin" }))).status, 404);
  });
  await t.test("server identity, exact ownership, source collisions, URL preservation and display allowlist", async () => {
    const start = Date.now();
    const first = await post(payload());
    assert.equal(first.status, 201);
    const row = first.data.activity;
    assert.equal(row.talentId, String(talent._id));
    assert.equal(row.posterId, String(employer._id));
    assert.equal(row.posterType, "Employer");
    assert.equal(row.destinationUrl, destination);
    assert.equal(Date.parse(row.clickedAt), start);
    assert.equal(row.source, "employer");
    assert.deepEqual(Object.keys(row).sort(), ["_id", "kind", "talentId", "intentId", "jobId", "source", "posterId", "posterType", "destinationUrl", "clickedAt", "display"].sort());
    assert.deepEqual(row.display, { jobTitle: "Synthetic External 10", companyName: "Synthetic Company", location: "Lagos", category: "Design", workType: "Remote", jobApplyType: "Contract" });
    const second = await post(payload({ jobId: String(id(11)) }));
    assert.equal(second.data.activity.posterId, String(otherEmployer._id));
    const adminResult = await post(payload({ source: "admin" }));
    assert.equal(adminResult.status, 201);
    assert.equal(adminResult.data.activity.posterId, String(admin._id));
    assert.equal(adminResult.data.activity.posterType, "Admin");
    assert.equal(adminResult.data.activity.display.companyName, "Synthetic Admin Publisher");
    const stored = await Activity.findById(row._id).lean();
    assert(!("secret" in stored)); assert(!("jobDescription" in stored.display));
  });
  await t.test("fresh intents count independently; identical and concurrent retries count once", async () => {
    const body = payload();
    const before = await Activity.countDocuments();
    const responses = await Promise.all(Array.from({ length: 12 }, () => post(body)));
    assert.equal(responses.filter(row => row.status === 201).length, 1);
    assert(responses.every(row => [200, 201].includes(row.status)));
    assert.equal(new Set(responses.map(row => row.data.activity._id)).size, 1);
    assert.equal(await Activity.countDocuments(), before + 1);
    const retry = await post({ ...body, intentId: body.intentId.toUpperCase() });
    assert.equal(retry.status, 200); assert(retry.data.replayed);
    assert.equal((await post(payload())).status, 201);
    assert.equal((await post(body, token(otherTalent))).status, 201);
    assert.equal(await Activity.countDocuments(), before + 3);
  });
  await t.test("conflicting reuse and stale destinations return distinct 409s", async () => {
    const body = payload(); await post(body);
    for (const changed of [{ jobId: String(id(11)) }, { source: "admin" }, { expectedDestination: destination + "changed" }]) {
      const result = await post({ ...body, ...changed });
      assert.equal(result.status, 409); assert.equal(result.data.code, "EXTERNAL_ACTIVITY_INTENT_CONFLICT");
    }
    const stale = await post(payload({ expectedDestination: "https://example.invalid/old" }));
    assert.equal(stale.status, 409); assert.equal(stale.data.code, "EXTERNAL_ACTIVITY_DESTINATION_CHANGED");
  });
  await t.test("both sources enforce shared visibility, deadline boundaries and External URL validation", async () => {
    const variants = [
      { status: "draft" }, { status: "closed" }, { isDeleted: true }, { isDeleted: null },
      { applicationType: "internal" }, { applicationType: "unknown" },
      { applicationUrl: "javascript:alert(1)" }, { deadlineDate: new Date("2026-11-01T23:59:59.999Z") },
    ];
    for (const source of ["employer", "admin"]) {
      const Model = source === "employer" ? Job : AdminJob;
      for (const [i, changes] of variants.entries()) {
        const value = job(100 + i, { postedBy: admin._id, ...changes });
        await Model.collection.insertOne(value);
        assert.equal((await post(payload({ jobId: String(value._id), source }))).status, 404);
      }
      const legacy = job(120, { postedBy: admin._id }); delete legacy.isDeleted;
      await Model.collection.insertOne(legacy);
      assert.equal((await post(payload({ jobId: String(legacy._id), source }))).status, 404);
      for (const [i, deadlineDate] of [null, undefined, new Date("2026-11-02T00:00:00Z"), new Date("2026-11-03T00:00:00Z")].entries()) {
        const value = job(130 + i, { postedBy: admin._id, deadlineDate });
        if (deadlineDate === undefined) delete value.deadlineDate;
        await Model.collection.insertOne(value);
        assert.equal((await post(payload({ jobId: String(value._id), source }))).status, 201);
      }
    }
  });
  await t.test("lost HTTP acknowledgement retries return the original record", async () => {
    const body = payload(); const before = await Activity.countDocuments();
    loseAcknowledgement = true;
    await assert.rejects(post(body));
    const retry = await post(body);
    assert.equal(retry.status, 200); assert.equal(retry.data.replayed, true);
    assert.equal(await Activity.countDocuments(), before + 1);
  });
  await t.test("lost database acknowledgement is resolved without a duplicate", async () => {
    const create = Activity.create.bind(Activity);
    const mock = t.mock.method(Activity, "create", async (...args) => {
      await create(...args); throw new Error("Synthetic lost database acknowledgement");
    });
    try {
      const before = await Activity.countDocuments();
      const result = await post(payload());
      assert.equal(result.status, 200); assert.equal(result.data.replayed, true);
      assert.equal(await Activity.countDocuments(), before + 1);
    } finally { mock.mock.restore(); }
  });
  await t.test("replay and immutable snapshot survive later edits, closure and deletion", async () => {
    const body = payload(); const first = await post(body);
    await Job.collection.updateOne({ _id: id(10) }, { $set: { jobTitle: "Edited", applicationUrl: "https://example.invalid/new", status: "closed" } });
    await Employer.collection.updateOne({ _id: employer._id }, { $set: { companyName: "Renamed" } });
    assert.deepEqual((await post(body)).data.activity, first.data.activity);
    await Job.collection.deleteOne({ _id: id(10) });
    assert.deepEqual((await post(body)).data.activity, first.data.activity);
    assert.equal((await post(payload())).status, 404);
  });
  await t.test("index removal or inspection failure disables recording; reprovision restores readiness", async () => {
    const before = await Activity.countDocuments();
    await Activity.collection.dropIndex(EXTERNAL_ACTIVITY_INTENT_INDEX);
    assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 503);
    assert.equal(await Activity.countDocuments(), before);
    // An index with the right name but without uniqueness is insufficient.
    await Activity.collection.createIndex({ talentId: 1, intentId: 1 }, { name: EXTERNAL_ACTIVITY_INTENT_INDEX });
    assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 503);
    await Activity.collection.dropIndex(EXTERNAL_ACTIVITY_INTENT_INDEX);
    await provision();
    const mock = t.mock.method(Activity.collection, "listIndexes", () => { throw new Error("Synthetic inspection failure"); });
    try { assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 503); }
    finally { mock.mock.restore(); }
    assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 201);
  });
  await t.test("in-flight concurrent inserts remain unique if compound protection is removed after inspection", async () => {
    const realList = Activity.collection.listIndexes.bind(Activity.collection);
    const snapshot = await realList().toArray();
    let inspections = 0, release;
    const bothInspected = new Promise(resolve => { release = resolve; });
    const mock = t.mock.method(Activity.collection, "listIndexes", () => ({ toArray: async () => {
      if (++inspections === 2) {
        await Activity.collection.dropIndex(EXTERNAL_ACTIVITY_INTENT_INDEX);
        release();
      }
      await bothInspected;
      return snapshot;
    } }));
    const body = payload({ jobId: String(id(11)) });
    const before = await Activity.countDocuments();
    try {
      const results = await Promise.all([post(body), post(body)]);
      assert.deepEqual(results.map(row => row.status).sort(), [200, 201]);
      assert.equal(new Set(results.map(row => row.data.activity._id)).size, 1);
      assert.equal(await Activity.countDocuments(), before + 1);
    } finally { mock.mock.restore(); }
    assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 503);
    await provision();
  });
  await t.test("compound uniqueness is enforced and provisioning refuses existing duplicate intents", async () => {
    const original = await Activity.findOne().lean();
    const duplicate = { ...original, _id: "synthetic-manual-duplicate" };
    await assert.rejects(Activity.collection.insertOne(duplicate), error => error.code === 11000);
    await Activity.collection.dropIndex(EXTERNAL_ACTIVITY_INTENT_INDEX);
    await Activity.collection.insertOne(duplicate);
    try {
      await assert.rejects(provision(), /E11000|duplicate key/);
      assert.equal((await post(payload({ jobId: String(id(11)) }))).status, 503);
    } finally {
      await Activity.collection.deleteOne({ _id: duplicate._id });
      await provision();
    }
  });
  await t.test("internal records, counts, notifications and existing history remain untouched", async () => {
    for (const collection of ["jobapplications", "adminjobapplications", "notifications"]) {
      assert.equal(await mongoose.connection.collection(collection).countDocuments(), 0);
    }
    assert.equal((await Job.findById(id(11)).lean()).applicantsCount, 7);
    assert.equal((await AdminJob.findById(id(10)).lean()).applicantsCount, 7);
    const response = await fetch(`${base}/my-applications`, { headers: { Authorization: `Bearer ${token()}` } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).applications, []);
  });
});
