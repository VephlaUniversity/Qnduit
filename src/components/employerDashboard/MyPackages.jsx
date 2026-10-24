import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmployerPlans } from "../EmployerPlans";
import { useEmployerSubscription } from "../hooks/useEmployerSubscription";
import { useEmployerPlanAction } from "../hooks/useEmployerPlanAction";
import { employerPlanName, employerStatusName, employerBillingDate } from "../utils/employerSubscription";

export const MyPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { data, loading, error, refresh } = useEmployerSubscription();
  const handlePlanAction = useEmployerPlanAction(undefined, { directCheckout: true });
  const navigate = useNavigate();
  const status = data?.subscriptionStatus, subscription = data?.subscription;
  const currentPlan = status?.effectivePlan;
  useEffect(() => { setSelectedPlan(null); }, [data?.accountId]);
  const dates = [
    ["Paid period start", subscription?.currentPeriodStart],
    ["Paid period end", subscription?.currentPeriodEnd],
    ["Cancelled on", subscription?.canceledAt],
    ["Access ended on", subscription?.endedAt],
  ].map(([label, value]) => [label, employerBillingDate(value)]).filter(([, value]) => value);
  return <div className="p-4 md:p-6 lg:p-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-white">My Packages</h1>
      <div className="flex gap-3"><button type="button" onClick={refresh} disabled={loading} className="rounded border border-blue-500 px-4 py-2 text-blue-400 disabled:opacity-50">Refresh plan</button>
        <button type="button" onClick={() => navigate("/dashboard")} className="rounded bg-blue-600 px-4 py-2 text-white">Continue to dashboard</button></div>
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
      {!status.paidEligible && subscription?.status === "active" && <p>The recorded subscription is still marked active. Contact Support to reconcile it before making another plan selection; continuing to the dashboard does not change it.</p>}
      {data.unpaidSelection && <p>Unpaid selection: {employerPlanName(data.unpaidSelection)}. This does not activate paid access.</p>}
      <dl className="grid gap-3 sm:grid-cols-2">{dates.map(([label, value]) => <div key={label}><dt className="text-gray-400">{label}</dt><dd>{value}</dd></div>)}</dl>
      {status.cancellation.scheduled && status.paidEligible && <p>Cancellation is scheduled for the end of the paid period.</p>}
      {data.pendingDowngrade && <p role="status">{employerPlanName(data.pendingDowngrade.fromPlan)} → {employerPlanName(data.pendingDowngrade.toPlan)}: awaiting processing. Current access stays active.</p>}
    </section>}
    {data && !error && <EmployerPlans selectedPlan={selectedPlan || (status.paidEligible ? currentPlan : data.unpaidSelection)} onSelectPlan={setSelectedPlan} onPlanAction={handlePlanAction} showPayLater={!status.paidEligible && subscription?.status !== "active"} />}
  </div>;
};
export default MyPackages;
