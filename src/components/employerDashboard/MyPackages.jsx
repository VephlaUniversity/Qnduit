import { useEffect, useState } from "react";
import { EmployerPlans } from "../EmployerPlans";
import { useEmployerSubscription } from "../hooks/useEmployerSubscription";
import { useEmployerPlanAction } from "../hooks/useEmployerPlanAction";
import { employerPlanName, employerStatusName } from "../utils/employerSubscription";
import SubscriptionDates from "../subscriptions/SubscriptionDates";

export const MyPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { data, loading, error, refresh } = useEmployerSubscription();
  const handlePlanAction = useEmployerPlanAction(undefined, { directCheckout: true });
  const status = data?.subscriptionStatus, subscription = data?.subscription;
  const currentPlan = status?.effectivePlan;
  useEffect(() => { setSelectedPlan(null); }, [data?.accountId]);
  return <div className="p-4 md:p-6 lg:p-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-white">My Packages</h1>
      <button type="button" onClick={refresh} disabled={loading} className="rounded border border-blue-500 px-4 py-2 text-blue-400 disabled:opacity-50">Refresh plan</button>
    </div>
    {loading && <p role="status" className="mb-6 text-gray-400">{data ? "Refreshing your plan…" : "Loading your plan…"}</p>}
    {error && <div role="alert" className="mb-6 rounded border border-red-500/30 p-4 text-red-400"><p>{error}</p>{data && <p>Previously loaded plan details may be out of date.</p>}<button type="button" onClick={refresh} className="mt-2 underline">Try again</button></div>}
    {data && <section aria-label="Current subscription" className="mb-8 space-y-3 rounded-lg border border-white/10 bg-[#1A1A1E] p-6 text-white">
      <h2 className="text-sm text-gray-400">Current plan</h2><p className="text-xl font-semibold">{employerPlanName(currentPlan)}</p>
      <p>Status: {employerStatusName(status.status)}</p>
      <p>{status.paidEligible ? "Application paid access is active." : "No active paid access. Free-plan limits apply."}</p>
      {!subscription && <p className="text-gray-400">No paid subscription is recorded.</p>}
      {subscription && !status.paidEligible && <p>Recorded subscription: {employerPlanName(subscription.plan)} — {employerStatusName(status.status)}</p>}
      {status.reason === "successful_payment_not_linked" && <p>Successful payment evidence could not be linked. Contact Support if you have paid.</p>}
      {!status.paidEligible && subscription?.status === "active" && <p>The recorded subscription is still marked active. Contact Support to reconcile it before making another plan selection.</p>}
      {data.unpaidSelection && <p>Unpaid selection: {employerPlanName(data.unpaidSelection)}. This does not activate paid access.</p>}
      <SubscriptionDates subscription={subscription} status={status} pendingDowngrade={data.pendingDowngrade} showTimezone={false} showRenewalNote={false} />
      {status.cancellation.scheduled && status.paidEligible && <p>Cancellation is scheduled for the end of the paid period.</p>}
      {data.pendingDowngrade && <p role="status">{employerPlanName(data.pendingDowngrade.fromPlan)} → {employerPlanName(data.pendingDowngrade.toPlan)}: awaiting processing. Current access stays active.</p>}
    </section>}
    {data && !error && <EmployerPlans selectedPlan={selectedPlan || (status.paidEligible ? currentPlan : data.unpaidSelection)} onSelectPlan={setSelectedPlan} onPlanAction={handlePlanAction} showPayLater={!status.paidEligible && subscription?.status !== "active"} />}
  </div>;
};
export default MyPackages;
