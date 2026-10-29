import { formatSubscriptionTimestamp, subscriptionDateRows } from "../utils/subscriptionDates";

export default function SubscriptionDates({ subscription, status, pendingDowngrade, showTimezone = true, showRenewalNote = true }) {
  const rows = subscriptionDateRows(subscription, status, pendingDowngrade);
  if (!rows.length) return null;
  return <div className="mt-3 space-y-2 text-sm">
    <dl className="grid gap-3 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-gray-400">{label}</dt>
      <dd className="break-words text-white"
        title={!showRenewalNote && label === "Subscription Renews" ? "Recorded period end; provider charge time is not confirmed." : undefined}
        aria-description={!showRenewalNote && label === "Subscription Renews" ? "Recorded period end; provider charge time is not confirmed." : undefined}>
        {showTimezone ? formatSubscriptionTimestamp(value) : formatSubscriptionTimestamp(value).replace(/ WAT \(Africa\/Lagos\)$/, "")}
      </dd>
    </div>)}</dl>
    {showRenewalNote && rows.some(([label]) => label === "Subscription Renews") && <p className="text-gray-400">
      Renewal is shown at the recorded period end. The provider’s next charge time is not available.
    </p>}
  </div>;
}
