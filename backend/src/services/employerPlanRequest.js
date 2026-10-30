import Admin from "../models/Admin.js";
import { SubscriptionLifecycle as Lifecycle } from "../models/SubscriptionLifecycle.js";
import { SubscriptionDowngrade as History } from "../models/SubscriptionLifecycle.js";
import { loadSubscriptionEvidence, subscriptionStatusFromEvidence } from "./subscriptionStatus.js";
import { withSubscriptionLifecycleTransaction, subscriptionActivationFingerprint, deactivateSubscriptionAccess } from "./subscriptionLifecycle.js";
import { EMPLOYER_PLAN_ORDER, OPEN_PLAN_REQUEST_STATUSES, PLAN_REQUEST_ID,
  employerPlanAction, employerPlanRequestKey, planRequestHash } from "../utils/employerPlanRequest.js";

const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const validId = value => /^[a-f\d]{24}$/i.test(String(value || ""));

export const employerRequestActivation = (subscription, state, accountId) => subscription
  ? subscriptionActivationFingerprint(subscription, state)
  : planRequestHash(["no-subscription", String(accountId).toLowerCase(), state?.generation || 0]);

export const IMMEDIATE_DOWNGRADE_POLICY = "immediate-downgrade-v1";

// Safe owner-facing DTO: no provider identifiers, fingerprints or account documents.
export const employerPlanRequestDto = record => record ? {
  id: String(record._id), requestId: record.requestId || null, employerId: String(record.account), fromPlan: record.fromPlan, toPlan: record.toPlan,
  appliedPlan: record.appliedPlan || null, executionPolicy: record.executionPolicy || null,
  actionType: record.actionType || null, status: record.status, outcome: record.outcome || null,
  requestedAt: record.requestedAt?.toISOString(), scheduledEffectiveAt: record.scheduledEffectiveAt?.toISOString() || null,
  actualEffectiveAt: record.actualEffectiveAt?.toISOString() || null,
  actorRole: record.actorRole || null, actorId: record.requestedBy ? String(record.requestedBy) : null,
} : null;

export async function employerPlanRequestContext(accountId) {
  const evidence = await loadSubscriptionEvidence({ role: "employer", accountId });
  if (!evidence.account) throw fail(401, "SUBSCRIPTION_ACCOUNT_MISSING", "Employer not found.");
  const state = await Lifecycle.findById(`employer:${String(accountId).toLowerCase()}`).lean();
  const now = new Date();
  const status = subscriptionStatusFromEvidence(evidence, { role: "employer", now });

  const fingerprint = employerRequestActivation(evidence.subscription, state, accountId);
  const pending = await History.findOne({ role: "employer", account: accountId,
    generation: state?.generation || 0, activationFingerprint: fingerprint, executionPolicy: { $ne: "payment-upgrade-v1" },
    status: { $in: OPEN_PLAN_REQUEST_STATUSES } }).sort({ requestedAt: -1, _id: -1 }).lean();
  const latest = await History.findOne({ role: "employer", account: accountId, executionPolicy: { $in: [IMMEDIATE_DOWNGRADE_POLICY, "payment-upgrade-v1"] },
    status: "applied", appliedGeneration: state?.generation || 0 }).sort({ requestedAt: -1, _id: -1 }).lean();
  return { accountId: String(accountId), currentPlan: status.effectivePlan, currentStatus: status.status, currentReason: status.reason,
    paidEligible: status.paidEligible, activationFingerprint: fingerprint, executionPolicy: IMMEDIATE_DOWNGRADE_POLICY,
    allowedPlans: status.paidEligible ? EMPLOYER_PLAN_ORDER.filter(plan => employerPlanAction(status.effectivePlan, plan) === "downgrade") : [],
    pendingRequest: employerPlanRequestDto(pending), latestAction: employerPlanRequestDto(latest) };
}

// authenticatedUser MUST be the verified server principal, never request JSON.
// Immediate local access downgrade only; no payment/provider/reconciliation operation.
export async function recordEmployerPlanRequest({ authenticatedUser, accountId, requestId, toPlan, expectedActivationFingerprint, expectedFromPlan, ...unsupported }) {
  if (Object.keys(unsupported).length || !validId(accountId) || typeof requestId !== "string" || !PLAN_REQUEST_ID.test(requestId) ||
      !EMPLOYER_PLAN_ORDER.includes(toPlan)) throw fail(400, "SUBSCRIPTION_REQUEST_INVALID", "A target, request UUID and valid Employer plan are required.");
  const actorRole = authenticatedUser?.role, actorId = authenticatedUser?._id;
  if (!["employer", "admin"].includes(actorRole) || !validId(actorId)) throw fail(403, "SUBSCRIPTION_REQUEST_DENIED", "An authenticated Employer or Admin is required.");
  accountId = String(accountId).toLowerCase();
  const requestedBy = String(actorId).toLowerCase();
  if (actorRole === "employer" && requestedBy !== accountId) throw fail(403, "SUBSCRIPTION_REQUEST_DENIED", "Employers may request changes only for their own account.");
  requestId = requestId.toLowerCase();
  const id = employerPlanRequestKey(accountId, requestId);
  const requestFingerprint = planRequestHash([IMMEDIATE_DOWNGRADE_POLICY, accountId, actorRole, requestedBy, toPlan]);
  return withSubscriptionLifecycleTransaction("employer", accountId, async context => {
    const { Account, Subscription, account, state, session } = context;
    if (actorRole === "admin") {
      const admin = await Admin.findById(requestedBy).select("isActive").session(session).lean();
      if (!admin?.isActive) throw fail(403, "SUBSCRIPTION_REQUEST_DENIED", "An active Admin is required.");
    } else if (account.accountStatus !== "active" || !account.isVerified) {
      throw fail(403, "SUBSCRIPTION_REQUEST_DENIED", "An active, verified Employer is required.");
    }
    const previous = await History.findById(id).session(session).lean();
    if (previous) {
      if (previous.executionPolicy !== IMMEDIATE_DOWNGRADE_POLICY || previous.requestVersion !== 2 || previous.requestFingerprint !== requestFingerprint ||
          previous.role !== "employer" || String(previous.account) !== accountId ||
          previous.actorRole !== actorRole || String(previous.requestedBy) !== requestedBy || previous.toPlan !== toPlan) {
        throw fail(409, "SUBSCRIPTION_REQUEST_CONFLICT", "This request ID belongs to a different request.");
      }
      return { recorded: true, replayed: true, request: previous };
    }
    if (account.accountStatus !== "active") throw fail(403, "SUBSCRIPTION_REQUEST_DENIED", "The target Employer must be active.");
    const evidence = await loadSubscriptionEvidence({ role: "employer", accountId, session });
    const now = new Date();
    const status = subscriptionStatusFromEvidence(evidence, { role: "employer", now });
    const fromPlan = status.effectivePlan, actionType = employerPlanAction(fromPlan, toPlan);
    const generation = state.generation || 0;
    const activationFingerprint = employerRequestActivation(evidence.subscription, state, accountId);
    if (expectedActivationFingerprint !== undefined && expectedActivationFingerprint !== activationFingerprint ||
        expectedFromPlan !== undefined && expectedFromPlan !== fromPlan) {
      throw fail(409, "SUBSCRIPTION_SELECTION_STALE", "Your current subscription changed. Refresh before requesting a change.");
    }
    if (actionType === "upgrade") throw fail(403, "SUBSCRIPTION_UPGRADE_NOT_ALLOWED", actorRole === "admin" ? "Admins cannot upgrade Employer subscriptions." : "Use Employer checkout to purchase a higher plan.");
    if (!actionType) throw fail(400, "SUBSCRIPTION_PLAN_CHANGE_INVALID", "Select a lower plan.");
    if (!status.paidEligible) throw fail(409, "SUBSCRIPTION_EVIDENCE_UNAVAILABLE", "An active payment-backed plan is required to downgrade.");
    // Earlier request-only/period-end rows are history, never executable intent.
    const appliedGeneration = generation + 1;
    const [request] = await History.create([{
      _id: id, requestVersion: 2, executionPolicy: IMMEDIATE_DOWNGRADE_POLICY, role: "employer", account: accountId,
      ...(evidence.subscription ? { subscription: evidence.subscription._id,
        lastTxRef: evidence.subscription.lastTxRef, lastTransactionId: evidence.subscription.lastTransactionId } : {}),
      ...(evidence.payment ? { sourcePayment: evidence.payment._id } : {}),
      generation, activationFingerprint, fromPlan, toPlan, actionType,
      requestedBy, actorRole, requestId, requestFingerprint, requestedAt: now,
      status: "applied", outcome: "applied", appliedPlan: toPlan, appliedGeneration,
      sourcePeriodStart: evidence.subscription.currentPeriodStart, sourcePeriodEnd: evidence.subscription.currentPeriodEnd,
      scheduledEffectiveAt: null, actualEffectiveAt: now,
    }], { session });
    if (toPlan === "free") {
      await deactivateSubscriptionAccess({ ...context, role: "employer", subscription: evidence.subscription, now });
    } else {
      await Subscription.updateOne({ _id: evidence.subscription._id, employer: accountId }, { $set: {
        accessPlan: toPlan, accessPlanHistory: id, accessPlanGeneration: appliedGeneration,
      } }, { session, runValidators: true });
      await Account.updateOne({ _id: accountId }, { $set: { selectedPlan: toPlan, paymentStatus: "active" } }, { session });
      await Lifecycle.updateOne({ _id: state._id }, { $set: { generation: appliedGeneration, pendingPayment: null } }, { session });
    }
    return { recorded: true, replayed: false, request: request.toObject() };
  });
}
