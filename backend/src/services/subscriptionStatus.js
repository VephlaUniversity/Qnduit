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

// Internal service: identity must come from authentication, never a browser plan.
// Database errors deliberately propagate; an unavailable lookup is not a Free plan.
export async function resolveSubscriptionStatus({ accountId, role, now = new Date() }) {
  const adapter = Object.hasOwn(adapters, role) ? adapters[role] : null;
  const time = dateValue(now);
  if (!adapter || !/^[a-f\d]{24}$/i.test(String(accountId)) || time === null) {
    throw new TypeError("A supported role, account ID and valid time are required.");
  }
  const [account, subscription] = await Promise.all([
    adapter.account.findById(accountId).select("_id accountStatus selectedPlan paymentStatus").lean(),
    adapter.subscription.findOne({ [adapter.ownerField]: accountId }).select(
      "plan status provider currentPeriodStart currentPeriodEnd cancelAtPeriodEnd canceledAt endedAt lastTxRef lastTransactionId"
    ).lean(),
  ]);
  const expiry = isoDate(subscription?.currentPeriodEnd);
  const periodStart = dateValue(subscription?.currentPeriodStart);
  const periodEnd = dateValue(subscription?.currentPeriodEnd);
  const plan = subscription?.plan || "free";
  let payment = null;
  // Link to this subscription's activation, not an arbitrary old successful payment.
  if (subscription && (subscription.lastTxRef || subscription.lastTransactionId)) {
    payment = await adapter.payment.findOne({
      [adapter.ownerField]: accountId,
      plan: subscription.plan,
      provider: subscription.provider,
      status: "successful",
      ...(subscription.lastTxRef ? { txRef: subscription.lastTxRef } : {}),
      ...(subscription.lastTransactionId ? { transactionId: subscription.lastTransactionId } : {}),
    }).select("_id").lean();
  }
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
