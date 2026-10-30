import { formatSubscriptionTimestamp, SUBSCRIPTION_TIME_ZONE } from "./subscriptionDates.js";

const concise = new Intl.DateTimeFormat("en-GB", {
  timeZone: SUBSCRIPTION_TIME_ZONE, day: "numeric", month: "short", year: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true,
});

// Reuse the existing timestamp validity rules; change presentation only.
export function employerSubscriptionDate(value) {
  if (formatSubscriptionTimestamp(value) === "Not recorded") return "Not recorded";
  return concise.format(new Date(value)).replace(/\b(am|pm)\b/gi, text => text.toUpperCase());
}
