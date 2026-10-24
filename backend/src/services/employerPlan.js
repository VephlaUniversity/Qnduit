import { loadSubscriptionEvidence, subscriptionStatusFromEvidence } from "./subscriptionStatus.js";
import { currentPendingDowngrade } from "./subscriptionLifecycle.js";

// The plan page uses the same evidence and eligibility decision as paid features.
// No payment/provider identifiers or account documents are serialized.
export async function getEmployerPlan(accountId) {
  const evidence = await loadSubscriptionEvidence({ accountId, role: "employer" });
  if (!evidence.account) throw Object.assign(new Error("Employer account not found."), { status: 401, code: "AUTH_ACCOUNT_MISSING" });
  const status = subscriptionStatusFromEvidence(evidence, { role: "employer" });
  const subscription = evidence.subscription;
  return {
    accountId: String(evidence.account._id),
    subscriptionStatus: status,
    subscription: subscription ? {
      plan: subscription.plan, status: subscription.status,
      currentPeriodStart: status.periodStart, currentPeriodEnd: status.expiry,
      cancelAtPeriodEnd: status.cancellation.scheduled,
      canceledAt: status.cancellation.cancelledAt, endedAt: status.cancellation.endedAt,
    } : null,
    unpaidSelection: !status.paidEligible && ["bronze", "silver", "platinum"].includes(evidence.account.selectedPlan)
      ? evidence.account.selectedPlan : null,
    pendingDowngrade: status.paidEligible
      ? await currentPendingDowngrade({ role: "employer", accountId, subscription }) : null,
  };
}
