export const SUBSCRIPTION_TIME_ZONE = "Africa/Lagos";
const calendarDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUBSCRIPTION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const timestamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: SUBSCRIPTION_TIME_ZONE, day: "numeric", month: "long", year: "numeric",
  hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
});

// A date without an explicit recorded time/offset must not become midnight.
export function formatSubscriptionTimestamp(value, now = new Date()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  const today = Number.isFinite(new Date(now).getTime()) && calendarDay.format(date) === calendarDay.format(new Date(now));
  const text = timestamp.formatToParts(date).map(part => part.type === "dayPeriod" ? part.value.toUpperCase() : part.value).join("");
  return `${today ? "Today · " : ""}${text} WAT (Africa/Lagos)`;
}

export function subscriptionDateRows(subscription, status, pendingDowngrade) {
  if (!subscription) return [];
  let endLabel = "Recorded Period End";
  if (status?.status === "expired") endLabel = "Subscription Ended";
  else if (status?.paidEligible === true && status.status === "active") {
    endLabel = pendingDowngrade ? "Current Period Ends"
      : status.cancellation?.scheduled || subscription.cancelAtPeriodEnd ? "Subscription Ends" : "Subscription Renews";
  }
  return [
    ["Subscription Starts", subscription.currentPeriodStart],
    [endLabel, subscription.currentPeriodEnd],
    ...(subscription.canceledAt ? [["Cancelled On", subscription.canceledAt]] : []),
    ...(subscription.endedAt ? [["Access Ended On", subscription.endedAt]] : []),
  ];
}

export const subscriptionStatusLabel = status => ({
  active: "Active", past_due: "Payment overdue", pending: "Awaiting payment", unpaid: "Unpaid",
  canceled: "Cancelled", cancelled: "Cancelled", expired: "Expired", inactive: "Inactive",
  inconsistent: "Payment confirmation unavailable", missing: "Unavailable",
})[status] || "Unavailable";
