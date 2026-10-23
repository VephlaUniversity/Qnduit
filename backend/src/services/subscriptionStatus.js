import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import TalentSubscription from "../models/TalentSubscription.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";

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
  let query = adapter.subscription.findOne({ [adapter.ownerField]: accountId, ...(invoice ? { status: "active" } : {}) });
  if (invoice) query = query.sort({ currentPeriodStart: -1, createdAt: -1, _id: -1 });
  const subscription = await query.select("plan status provider currentPeriodStart currentPeriodEnd cancelAtPeriodEnd canceledAt endedAt lastTxRef lastTransactionId").session(session).lean();
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
  return { account, subscription, payment, ambiguousPayment };
}

// Pure evaluation shared with invoice validation; its public DTO is unchanged.
export function subscriptionStatusFromEvidence({ account, subscription, payment }, { role, now = new Date() }) {
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
  } else if (!payment) { status = "unpaid"; reason = "successful_payment_not_linked"; }
  else { status = "active"; reason = "confirmed_subscription"; }
  const paidEligible = status === "active";
  return {
    role, status, plan, effectivePlan: paidEligible ? plan : "free", expiry,
    periodStart: isoDate(subscription?.currentPeriodStart), paidEligible, reason,
    cancellation: {
      scheduled: Boolean(subscription?.cancelAtPeriodEnd),
      cancelled: ["canceled", "cancelled"].includes(subscription?.status),
      cancelledAt: isoDate(subscription?.canceledAt), endedAt: isoDate(subscription?.endedAt),
    },
    // Account flags are diagnostic only: they cannot activate or revoke payment evidence.
    accountStateMatches: Boolean(account && subscription &&
      account.selectedPlan === plan && account.paymentStatus === "active"),
    eligibility: {
      talentPublicProfile: role === "talent" && paidEligible && plan === "public",
      employerBronzeFeatures: role === "employer" && paidEligible,
      unlimitedJobPosting: role === "employer" && paidEligible,
      employerMessaging: role === "employer" && paidEligible && ["silver", "platinum"].includes(plan),
    },
  };
}

// Existing callers retain the same loading and entitlement semantics.
export async function resolveSubscriptionStatus({ accountId, role, now = new Date(), session = null }) {
  if (dateValue(now) === null) throw new TypeError("A valid time is required.");
  return subscriptionStatusFromEvidence(await loadSubscriptionEvidence({ accountId, role, session }), { role, now });
}
