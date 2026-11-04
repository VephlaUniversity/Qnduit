import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import mongoose from "mongoose";
import Activity from "../src/models/ExternalApplicationActivity.js";
import JobApplication from "../src/models/JobApplication.js";
import { getApplicationActivityFeed } from "../src/controllers/applicationActivityFeedController.js";

test("Talent grouping index evidence: disposable synthetic database only", {
  skip: process.env.APPLICATION_FEED_EXPLAIN_LOCAL_TEST !== "1",
}, async t => {
  await mongoose.connect(`mongodb://127.0.0.1:27933/qnduit_feed_explain_${process.pid}_${Date.now()}`,
    { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const id = n => new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
  await Activity.createCollection(); await Activity.createIndexes();
  const rows = Array.from({ length: 20000 }, (_, n) => ({
    _id: `event-${String(n).padStart(6, "0")}`, talentId: id(Math.floor(n / 500) + 1), intentId: `intent-${n}`,
    jobId: id(1000 + n % 50), source: n % 2 ? "admin" : "employer", posterId: id(100),
    posterType: n % 2 ? "Admin" : "Employer", clickedAt: new Date(1700000000000 + n),
    destinationUrl: "https://example.invalid/synthetic", display: { jobTitle: `Synthetic ${n}` },
  }));
  await Activity.collection.insertMany(rows);
  const evidence = [];
  for (const source of ["all", "employer"]) {
    let pipeline;
    const mock = t.mock.method(JobApplication, "aggregate", value => { pipeline = value; return Promise.resolve([]); });
    try {
      await getApplicationActivityFeed({ user: { _id: id(1) }, query: { type: "external", source } },
        { set() {}, json() {} });
    } finally { mock.mock.restore(); }
    const external = pipeline.find(stage => stage.$unionWith?.coll === Activity.collection.name).$unionWith.pipeline;
    for (const index of ["automatic_existing", "external_activity_talent_time", "synthetic_group_candidate"]) {
      if (index === "synthetic_group_candidate") {
        // This candidate exists ONLY in the disposable test database.
        await Activity.collection.createIndex({ talentId: 1, source: 1, jobId: 1, clickedAt: -1, _id: -1 }, { name: index });
      }
      const aggregate = Activity.aggregate(external);
      if (index !== "automatic_existing") aggregate.hint(index);
      const explain = await aggregate.explain("executionStats");
      const cursor = explain.stages.find(stage => stage.$cursor).$cursor;
      const sortStages = explain.stages.filter(stage => stage.$sort);
      evidence.push({ source, index, totalDocsExamined: cursor.executionStats.totalDocsExamined,
        totalKeysExamined: cursor.executionStats.totalKeysExamined,
        cursorHasSort: JSON.stringify(cursor.queryPlanner.winningPlan).includes('"stage":"SORT"'),
        winningPlan: cursor.queryPlanner.winningPlan,
        aggregateSortStages: sortStages.length,
        groupCount: explain.stages.at(-1).nReturned,
        spills: sortStages.map(stage => stage.spills || 0) });
      assert(cursor.executionStats.totalDocsExamined <= 500, "Must stay within one Talent's events");
      if (index === "synthetic_group_candidate") await Activity.collection.dropIndex(index);
    }
  }
  console.log("SYNTHETIC_EXPLAIN", JSON.stringify({ events: rows.length, talents: 40, eventsPerTalent: 500, evidence }));
  assert(evidence.filter(row => row.index === "external_activity_talent_time").every(row => !row.cursorHasSort && row.aggregateSortStages === 0));
});
