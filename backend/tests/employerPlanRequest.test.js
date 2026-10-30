import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { SubscriptionDowngrade as History } from "../src/models/SubscriptionLifecycle.js";
import { employerPlanRequestKey, employerPlanAction } from "../src/utils/employerPlanRequest.js";

const owner = new mongoose.Types.ObjectId(), admin = new mongoose.Types.ObjectId();
const requestId = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-30T10:00:00Z");
const base = () => ({ _id: employerPlanRequestKey(owner, requestId), requestVersion: 2,
  role: "employer", account: owner, generation: 1, activationFingerprint: "a".repeat(64),
  fromPlan: "silver", toPlan: "platinum", requestedBy: owner, actorRole: "employer",
  actionType: "upgrade", requestId, requestFingerprint: "b".repeat(64), requestedAt: now,
  status: "pending", outcome: "recorded" });

test("Employer plan history schema", async t => {
  await t.test("legacy Employer and Talent documents retain absent fields", async () => {
    for (const role of ["employer", "talent"]) {
      const legacy = new History({ _id: `legacy-${role}`, role, account: owner,
        subscription: new mongoose.Types.ObjectId(), generation: 0, activationFingerprint: "legacy",
        fromPlan: role === "talent" ? "public" : "silver", toPlan: "free", requestedBy: admin, requestedAt: now });
      await legacy.validate();
      for (const field of ["requestVersion", "actorRole", "actionType", "outcome", "appliedPlan", "scheduledEffectiveAt", "actualEffectiveAt", "requestId", "payment"]) {
        assert.equal(Object.hasOwn(legacy.toObject(), field), false, field);
      }
    }
  });
  await t.test("Free requests have no fabricated subscription/payment/effective date", async () => {
    const record = new History({ ...base(), fromPlan: "free" });
    await record.validate();
    for (const field of ["subscription", "sourcePayment", "payment", "appliedPlan", "scheduledEffectiveAt", "actualEffectiveAt"]) assert.equal(record[field], undefined);
    assert.ok(record.requestedAt instanceof Date);
    assert.equal(History.collection.name, "subscriptiondowngrades");
  });
  await t.test("Admin actor need not equal Employer; Employer actor must", async () => {
    await new History({ ...base(), actorRole: "admin", requestedBy: admin }).validate();
    await assert.rejects(new History({ ...base(), requestedBy: admin }).validate(), /own the target/);
  });
  const invalid = [
    ["unsupported role", { role: "talent" }], ["missing actor", { actorRole: undefined }],
    ["invalid actor", { actorRole: "user" }], ["missing actor ID", { requestedBy: undefined }],
    ["missing Employer", { account: undefined }], ["invalid owner", { account: "wrong" }],
    ["wrong direction", { actionType: "downgrade" }], ["same plan", { toPlan: "silver" }],
    ["unknown plan", { toPlan: "public" }], ["invalid request date", { requestedAt: "invalid" }],
    ["missing request date", { requestedAt: undefined }], ["invalid scheduled date", { scheduledEffectiveAt: "invalid" }],
    ["invalid actual date", { actualEffectiveAt: "invalid" }], ["early schedule", { scheduledEffectiveAt: new Date(now - 1) }],
    ["missing schedule", { status: "scheduled", outcome: "scheduled" }],
    ["unapplied claim", { appliedPlan: "platinum" }], ["missing actual date", { status: "applied", outcome: "applied", appliedPlan: "platinum", appliedGeneration: 2 }],
    ["wrong applied plan", { status: "applied", outcome: "applied", appliedPlan: "bronze", actualEffectiveAt: now, appliedGeneration: 2 }],
    ["early application", { status: "applied", outcome: "applied", appliedPlan: "platinum", actualEffectiveAt: new Date(now - 1), appliedGeneration: 2 }],
    ["outcome mismatch", { outcome: "applied" }], ["unknown status", { status: "successful" }],
    ["invalid generation", { generation: 1.5 }], ["invalid request ID", { requestId: "bad" }],
    ["wrong idempotency binding", { _id: "other" }], ["invalid linkage", { payment: "not-an-id" }],
  ];
  for (const [name, change] of invalid) await t.test(name, async () => assert.rejects(new History({ ...base(), ...change }).validate()));
  await t.test("scheduled/applied/terminal history validates without executing anything", async () => {
    for (const status of ["scheduled", "applied", "failed", "cancelled", "superseded", "awaiting_payment"]) {
      await new History({ ...base(), status, outcome: status,
        ...(status === "scheduled" ? { scheduledEffectiveAt: now } : {}),
        ...(status === "applied" ? { appliedPlan: "platinum", actualEffectiveAt: now, appliedGeneration: 2 } : {}),
      }).validate();
    }
    assert.equal(employerPlanAction("platinum", "free"), "downgrade");
    assert.equal(employerPlanAction("free", "bronze"), "upgrade");
  });
});
