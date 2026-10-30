import { useEmployerSubscription } from "../hooks/useEmployerSubscription";
import EmployerPlanRequests from "./EmployerPlanRequests";
import { employerPlanName } from "../utils/employerSubscription";
import { formatSubscriptionTimestamp, subscriptionDateRows, subscriptionStatusLabel } from "../utils/subscriptionDates";
import { employerSubscriptionDate } from "../utils/employerSubscriptionDate";
import UserSubscriptionCancellation from "../subscriptions/UserSubscriptionCancellation";

export const MyPackages = () => {
  const { data, loading, error, refresh } = useEmployerSubscription();
  const status = data?.subscriptionStatus, subscription = data?.subscription;
  const currentPlan = status?.effectivePlan;
  const dateLabels = { "Subscription Starts": "Started", "Subscription Renews": "Renews", "Current Period Ends": "Period ends",
    "Subscription Ends": "Ends", "Subscription Ended": "Ended", "Recorded Period End": "Period end", "Cancelled On": "Cancelled", "Access Ended On": "Access ended" };
  return <div className="p-4 md:p-6 lg:p-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-white">My Packages</h1><p className="mt-1 text-xs text-gray-400">Dates in WAT</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="rounded border border-blue-500 px-4 py-2 text-blue-400 disabled:opacity-50">Refresh plan</button>
    </div>
    {loading && <p role="status" className="mb-6 text-gray-400">{data ? "Refreshing your plan…" : "Loading your plan…"}</p>}
    {error && <div role="alert" className="mb-6 rounded border border-red-500/30 p-4 text-red-400"><p>{error}</p>{data && <p>Previously loaded plan details may be out of date.</p>}<button type="button" onClick={refresh} className="mt-2 underline">Try again</button></div>}
    {data && <section aria-label="Current subscription" className="mb-4 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 sm:px-5 text-white">
      <div className="flex flex-wrap items-center gap-2.5"><h2 className="text-lg font-semibold">{employerPlanName(currentPlan)}</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.paidEligible ? "border-green-500/25 bg-green-500/10 text-green-400" : "border-white/15 bg-white/5 text-gray-300"}`}>{subscriptionStatusLabel(status.status)}</span>
      </div>
      {subscription && !status.paidEligible && <p className="mt-2 text-sm text-gray-400">Recorded plan: {employerPlanName(subscription.plan)}</p>}
      {status.reason === "successful_payment_not_linked" && <p>Successful payment evidence could not be linked. Contact Support if you have paid.</p>}
      {!status.paidEligible && subscription?.status === "active" && <p>The recorded subscription is still marked active. Contact Support to reconcile it before making another plan selection.</p>}
      {data.unpaidSelection && <p>Unpaid selection: {employerPlanName(data.unpaidSelection)}. This does not activate paid access.</p>}
      <dl className="mt-3 grid gap-2 text-sm sm:flex sm:flex-wrap sm:gap-x-8">
        {subscriptionDateRows(subscription, status, data.pendingDowngrade).map(([label, value]) => <div key={label} className="min-w-0 flex flex-wrap gap-x-2">
          <dt className="text-gray-400">{dateLabels[label]}</dt><dd className="break-words" title={formatSubscriptionTimestamp(value)}>{employerSubscriptionDate(value)}</dd>
        </div>)}
      </dl>
      {status.paidEligible && (
        <UserSubscriptionCancellation
          onCancelled={refresh}
        />
      )}
      {status.cancellation.scheduled && status.paidEligible && <p>Cancellation is scheduled for the end of the paid period.</p>}
    </section>}
    {data && !error && <EmployerPlanRequests key={data.accountId} currentPlan={currentPlan} onApplied={refresh} />}
  </div>;
};
export default MyPackages;
