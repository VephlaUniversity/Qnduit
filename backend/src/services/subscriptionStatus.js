import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import TalentSubscription from "../models/TalentSubscription.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";

import { SubscriptionDowngrade as History, SubscriptionLifecycle as Lifecycle } from "../models/SubscriptionLifecycle.js";

const accessPlans = ["free", "bronze", "silver", "platinum"];
const hasRestriction = subscription => ["accessPlan", "accessPlanHistory", "accessPlanGeneration"].some(field => subscription?.[field] != null);

const adapters = {
  talent: { account: Talent, subscription: TalentSubscription, payment: TalentPayment,
    ownerField: "talent", plans: ["public"] },
  employer: { account: Employer, subscription: EmployerSubscription, payment: EmployerPayment,
    ownerField: "employer", plans: ["bronze", "silver", "platinum"] },
};
const dateValue = value => {
  if (value === undefined || value === null || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};
const isoDate = value => {
  const time = dateValue(value);
  return time === null ? null : new Date(time).toISOString();
};

// Internal loader: never serialize these account/payment documents into API DTOs.
// Invoice reads opt into explicit billing fields; existing entitlement reads retain
// their original selection and matching behavior.
export async function loadSubscriptionEvidence({ accountId, role, session = null, invoice = false }) {
  const adapter = Object.hasOwn(adapters, role) ? adapters[role] : null;
  if (!adapter || !/^[a-f\d]{24}$/i.test(String(accountId))) throw new TypeError("A supported role and account ID are required.");
  // Keep session operations sequential for callers using a transaction.
  const account = await adapter.account.findById(accountId).select(invoice
    ? "_id accountStatus selectedPlan paymentStatus email firstName lastName fullName companyName displayName"
    : "_id accountStatus selectedPlan paymentStatus").session(session).lean();
  const subscriptionFields = "plan status provider currentPeriodStart currentPeriodEnd cancelAtPeriodEnd canceledAt endedAt lastTxRef lastTransactionId accessPlan accessPlanHistory accessPlanGeneration";
  let subscription, ambiguousSubscription = false;
  if (invoice) {
    // Do not choose a plausible invoice if historical/migrated records violate
    // the expected one-subscription-per-owner invariant.
    const matches = await adapter.subscription.find({ [adapter.ownerField]: accountId, status: "active" })
      .sort({ currentPeriodStart: -1, createdAt: -1, _id: -1 }).select(subscriptionFields).limit(2).session(session).lean();
    subscription = matches[0] || null;
    ambiguousSubscription = matches.length > 1;
  } else {
    subscription = await adapter.subscription.findOne({ [adapter.ownerField]: accountId }).select(subscriptionFields).session(session).lean();
  }
  let payment = null, ambiguousPayment = false;
  if (subscription && (subscription.lastTxRef || subscription.lastTransactionId)) {
    const filter = { [adapter.ownerField]: accountId, plan: subscription.plan, provider: subscription.provider, status: "successful",
      ...(subscription.lastTxRef ? { txRef: subscription.lastTxRef } : {}),
      ...(subscription.lastTransactionId ? { transactionId: subscription.lastTransactionId } : {}) };
    if (invoice) {
      const matches = await adapter.payment.find(filter).select("_id plan provider status type amount currency txRef transactionId paidAt").limit(2).session(session).lean();
      payment = matches[0] || null; ambiguousPayment = matches.length > 1;
    } else payment = await adapter.payment.findOne(filter).select("_id").session(session).lean();
  }
  let restrictionValid = false;
  if (role === "employer" && hasRestriction(subscription) && payment) {
    const change = typeof subscription.accessPlanHistory === "string"
      ? await History.findById(subscription.accessPlanHistory).session(session).lean() : null;
    const state = await Lifecycle.findById(`employer:${String(accountId).toLowerCase()}`).select("generation").session(session).lean();
    const sameDate = (a, b) => a instanceof Date && b instanceof Date && Number.isFinite(a.getTime()) && a.getTime() === b.getTime();
    restrictionValid = Boolean(change && change.executionPolicy === "immediate-downgrade-v1" && change.requestVersion === 2 &&
      change.role === "employer" && String(change.account) === String(accountId) && String(change.subscription) === String(subscription._id) &&
      String(change.sourcePayment) === String(payment._id) && change.actionType === "downgrade" && change.status === "applied" && change.outcome === "applied" &&
      change.appliedPlan === subscription.accessPlan && change.toPlan === subscription.accessPlan &&
      accessPlans.indexOf(subscription.accessPlan) > 0 && accessPlans.indexOf(subscription.accessPlan) < accessPlans.indexOf(change.fromPlan) &&
      accessPlans.indexOf(change.fromPlan) <= accessPlans.indexOf(subscription.plan) &&
      Number.isSafeInteger(change.generation) && change.appliedGeneration === change.generation + 1 &&
      change.appliedGeneration === subscription.accessPlanGeneration && change.appliedGeneration === state?.generation &&
      change.lastTxRef === subscription.lastTxRef && change.lastTransactionId === subscription.lastTransactionId &&
      sameDate(change.sourcePeriodStart, subscription.currentPeriodStart) && sameDate(change.sourcePeriodEnd, subscription.currentPeriodEnd) &&
      change.requestedAt instanceof Date && change.actualEffectiveAt instanceof Date &&
      change.actualEffectiveAt >= change.requestedAt && change.actualEffectiveAt >= subscription.currentPeriodStart &&
      change.actualEffectiveAt < subscription.currentPeriodEnd && change.actualEffectiveAt <= new Date() &&
      ["employer", "admin"].includes(change.actorRole) && change.requestedBy &&
      (change.actorRole !== "employer" || String(change.requestedBy) === String(accountId)));
  }
  return { account, subscription, payment, ambiguousPayment, ambiguousSubscription, restrictionValid };
}

// Pure evaluation shared with invoice validation; its public DTO is unchanged.
export function subscriptionStatusFromEvidence({ account, subscription, payment, restrictionValid = false }, { role, now = new Date() }) {
  const adapter = Object.hasOwn(adapters, role) ? adapters[role] : null;
  const time = dateValue(now);
  if (!adapter || time === null) throw new TypeError("A supported role and valid time are required.");
  const expiry = isoDate(subscription?.currentPeriodEnd);
  const periodStart = dateValue(subscription?.currentPeriodStart);
  const periodEnd = dateValue(subscription?.currentPeriodEnd);
  const plan = subscription?.plan || "free";
  let status;
  let reason;
  if (!account) { status = "missing"; reason = "account_missing"; }
  else if (account.accountStatus !== "active") { status = "inactive"; reason = "account_inactive"; }
  else if (!subscription) { status = "unpaid"; reason = "subscription_missing"; }
  else if (!adapter.plans.includes(plan)) { status = "inactive"; reason = "unsupported_plan"; }
  else if (["canceled", "cancelled"].includes(subscription.status)) { status = "cancelled"; reason = "subscription_cancelled"; }
  else if (subscription.status === "expired" || (periodEnd !== null && periodEnd <= time)) { status = "expired"; reason = "subscription_expired"; }
  else if (subscription.status === "past_due") { status = "past_due"; reason = "payment_overdue"; }
  else if (subscription.status === "pending") { status = "unpaid"; reason = "subscription_pending"; }
  else if (subscription.status !== "active") { status = "inactive"; reason = "subscription_inactive"; }
  else if (periodStart === null || periodEnd === null || periodEnd <= periodStart || periodStart > time) {
    status = "inactive"; reason = "invalid_subscription_period";
  } else if (subscription.endedAt || subscription.canceledAt && !subscription.cancelAtPeriodEnd) {
    status = "inconsistent"; reason = "conflicting_cancellation_metadata";
  } else if (role === "employer" && hasRestriction(subscription) && !restrictionValid) { status = "inconsistent"; reason = "invalid_access_restriction"; }
  else if (!payment) { status = "unpaid"; reason = "successful_payment_not_linked"; }
  else { status = "active"; reason = "confirmed_subscription"; }
  const paidEligible = status === "active";
  const effectivePlan = paidEligible ? role === "employer" && hasRestriction(subscription) ? subscription.accessPlan : plan : "free";
  return {
    role, status, plan, effectivePlan, expiry,
    periodStart: isoDate(subscription?.currentPeriodStart), paidEligible, reason,
    cancellation: {
      scheduled: Boolean(subscription?.cancelAtPeriodEnd),
      cancelled: ["canceled", "cancelled"].includes(subscription?.status),
      cancelledAt: isoDate(subscription?.canceledAt), endedAt: isoDate(subscription?.endedAt),
    },
    // Account flags are diagnostic only: they cannot activate or revoke payment evidence.
    accountStateMatches: Boolean(account && subscription &&
      account.selectedPlan === effectivePlan && account.paymentStatus === "active"),
    eligibility: {
      talentPublicProfile: role === "talent" && paidEligible && plan === "public",
      employerBronzeFeatures: role === "employer" && paidEligible,
      unlimitedJobPosting: role === "employer" && paidEligible,
      employerMessaging: role === "employer" && paidEligible && ["silver", "platinum"].includes(effectivePlan),
    },
  };
}

// Existing callers retain the same loading and entitlement semantics.
export async function resolveSubscriptionStatus({ accountId, role, now = new Date(), session = null }) {
  if (dateValue(now) === null) throw new TypeError("A valid time is required.");
  return subscriptionStatusFromEvidence(await loadSubscriptionEvidence({ accountId, role, session }), { role, now });
}
