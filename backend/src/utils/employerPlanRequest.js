import { createHash } from "node:crypto";

export const EMPLOYER_PLAN_ORDER = ["free", "bronze", "silver", "platinum"];
export const OPEN_PLAN_REQUEST_STATUSES = ["pending", "awaiting_payment", "scheduled"];
export const PLAN_REQUEST_ID = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export const planRequestHash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const employerPlanRequestKey = (accountId, requestId) =>
  planRequestHash(["employer-plan-request-v2", String(accountId).toLowerCase(), requestId.toLowerCase()]);

export function employerPlanAction(fromPlan, toPlan) {
  const from = EMPLOYER_PLAN_ORDER.indexOf(fromPlan), to = EMPLOYER_PLAN_ORDER.indexOf(toPlan);
  if (from < 0 || to < 0 || from === to) return null;
  return to > from ? "upgrade" : "downgrade";
}

// Called after Mongoose casts Date/ObjectId fields. No defaults/backfill for legacy rows.
export function validateEmployerPlanHistory(record) {
  if (record.requestVersion !== 2) return [];
  const errors = [];
  const reject = (field, message) => errors.push([field, message]);
  if (record.role !== "employer") reject("role", "Version 2 history is Employer-only.");
  if (!Number.isSafeInteger(record.generation) || record.generation < 0) reject("generation", "A valid source activation generation is required.");
  if (!employerPlanAction(record.fromPlan, record.toPlan) ||
      record.actionType !== employerPlanAction(record.fromPlan, record.toPlan)) {
    reject("actionType", "The action must match two distinct Employer plans.");
  }
  if (record.actorRole === "employer" && String(record.requestedBy) !== String(record.account)) {
    reject("requestedBy", "An Employer actor must own the target account.");
  }
  if (record.outcome !== (record.status === "pending" ? "recorded" : record.status)) {
    reject("outcome", "The outcome must describe the recorded request status.");
  }
  for (const field of ["requestedAt", "scheduledEffectiveAt", "actualEffectiveAt"]) {
    const value = record[field];
    if (value != null && (!(value instanceof Date) || !Number.isFinite(value.getTime()))) {
      reject(field, "A valid Date is required.");
    }
    if (field !== "requestedAt" && value instanceof Date && record.requestedAt instanceof Date && value < record.requestedAt) {
      reject(field, "An effective date cannot precede the request.");
    }
  }
  if (record.status === "scheduled" && !record.scheduledEffectiveAt) reject("scheduledEffectiveAt", "A scheduled request needs an effective date.");
  if (record.status === "applied") {
    if (record.appliedPlan !== record.toPlan) reject("appliedPlan", "The applied plan must match the requested plan.");
    if (!record.actualEffectiveAt) reject("actualEffectiveAt", "Applied history needs its actual effective date.");
    if (!Number.isSafeInteger(record.appliedGeneration) || record.appliedGeneration < record.generation) {
      reject("appliedGeneration", "Applied history needs a valid resulting activation generation.");
    }
  } else if (record.appliedPlan != null || record.actualEffectiveAt != null || record.appliedGeneration != null) {
    reject("appliedPlan", "Unapplied requests cannot claim an applied plan, date or generation.");
  }
  if (PLAN_REQUEST_ID.test(record.requestId || "") && record._id !== employerPlanRequestKey(record.account, record.requestId)) {
    reject("_id", "The idempotency key must bind the request to its Employer.");
  }
  if (record.executionPolicy === "immediate-downgrade-v1") {
    if (record.actionType !== "downgrade" || record.status !== "applied") reject("status", "Immediate downgrades must record an applied downgrade.");
    for (const field of ["sourcePeriodStart", "sourcePeriodEnd"]) {
      if (!(record[field] instanceof Date) || !Number.isFinite(record[field].getTime())) reject(field, "A valid funded period is required.");
    }
    if (!record.subscription || !record.sourcePayment) reject("sourcePayment", "Verified source subscription and payment are required.");
    if (record.sourcePeriodStart > record.actualEffectiveAt || record.sourcePeriodEnd <= record.actualEffectiveAt) reject("actualEffectiveAt", "The funded period must be current when applied.");
    if (record.appliedGeneration !== record.generation + 1) reject("appliedGeneration", "Downgrades must advance the activation generation once.");
    if (record.scheduledEffectiveAt != null) reject("scheduledEffectiveAt", "Immediate downgrades are not scheduled.");
  }
  if (record.executionPolicy === "payment-upgrade-v1") {
    if (record.actionType !== "upgrade" || record.actorRole !== "employer") reject("actorRole", "Only Employers can purchase upgrades.");
    if (!record.payment) reject("payment", "Upgrade history requires a checkout payment.");
    if (!["awaiting_payment", "applied", "failed", "superseded"].includes(record.status)) reject("status", "Invalid upgrade outcome.");
    if (record.scheduledEffectiveAt != null) reject("scheduledEffectiveAt", "Upgrades apply only on verified payment, never on a schedule.");
    if (record.status === "applied" && record.appliedGeneration !== record.generation + 1) reject("appliedGeneration", "Verified upgrades must advance the generation once.");
  }
  return errors;
}
