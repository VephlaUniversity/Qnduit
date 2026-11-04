import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import mongoose from "mongoose";
import Activity from "../src/models/ExternalApplicationActivity.js";
import { employerExternalActivityPipeline } from "../src/services/employerExternalActivity.js";

const candidateName = "external_activity_employer_figures";
export const candidateKey = { posterId: 1, posterType: 1, source: 1, jobId: 1, talentId: 1 };

test("Employer figures index comparison: disposable synthetic database only", {
  skip: process.env.EMPLOYER_EXTERNAL_EXPLAIN_LOCAL_TEST !== "1",
}, async t => {
  await mongoose.connect(`mongodb://127.0.0.1:27933/qnduit_employer_explain_${process.pid}_${Date.now()}`,
    { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  await Activity.createCollection();
  for (const [key, options] of Activity.schema.indexes()) {
    if (options.name !== candidateName) await Activity.collection.createIndex(key, options);
  }
  const rows = Array.from({ length: 20000 }, (_, n) => ({
    _id: `event-${n}`, intentId: `intent-${n}`, talentId: id(n % 30 + 1), jobId: id(1000 + n % 50),
    posterId: id(100 + Math.floor(n / 500)), source: n % 10 ? "employer" : "admin", posterType: n % 10 ? "Employer" : "Admin",
    clickedAt: new Date(1700000000000 + n), destinationUrl: "https://example.invalid/private", display: { jobTitle: `Synthetic ${n}` },
  }));
  await Activity.collection.insertMany(rows);
  const evidence = [];
  for (const phase of ["before", "candidate"]) {
    if (phase === "candidate") await Activity.collection.createIndex(candidateKey, { name: candidateName });
    for (const scope of ["dashboard", "jobs"]) {
      const pipeline = employerExternalActivityPipeline(id(100), scope === "jobs" ? Array.from({ length: 10 }, (_, n) => id(1000 + n)) : undefined);
      const explain = await Activity.aggregate(pipeline).explain("executionStats");
      const cursor = explain.stages.find(stage => stage.$cursor).$cursor;
      evidence.push({ phase, scope, docsExamined: cursor.executionStats.totalDocsExamined, keysExamined: cursor.executionStats.totalKeysExamined,
        plan: cursor.queryPlanner.winningPlan.queryPlan || cursor.queryPlanner.winningPlan,
        returned: explain.stages.at(-1).nReturned });
    }
  }
  console.log("EMPLOYER_SYNTHETIC_EXPLAIN", JSON.stringify({ events: rows.length, owners: 40, eventsPerOwner: 500, evidence }));
  for (const scope of ["dashboard", "jobs"]) {
    const before = evidence.find(row => row.phase === "before" && row.scope === scope);
    const after = evidence.find(row => row.phase === "candidate" && row.scope === scope);
    assert(after.docsExamined < before.docsExamined);
    assert(after.keysExamined <= 500);
  }
});
