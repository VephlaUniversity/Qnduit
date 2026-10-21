import Talent from "../models/Talent.js";
import { resolveSubscriptionStatus } from "./subscriptionStatus.js";

// Shared by the public reader and authenticated owner subscription response.
export async function resolveTalentPublication(accountId, now = new Date()) {
  const [talent, subscriptionStatus] = await Promise.all([
    Talent.findById(accountId).select(
      "username isVerified accountStatus showProfile publicProfileEnabled selectedPlan paymentStatus"
    ).lean(),
    resolveSubscriptionStatus({ accountId, role: "talent", now }),
  ]);
  let reason = "published";
  if (!talent) reason = "account_missing";
  else if (!talent.isVerified) reason = "unverified";
  else if (talent.accountStatus !== "active") reason = "account_inactive";
  else if (talent.showProfile !== "show") reason = "hidden";
  else if (!subscriptionStatus.eligibility.talentPublicProfile) reason = subscriptionStatus.reason;
  // Retain the existing publication switch and account-state protections.
  else if (!talent.publicProfileEnabled || talent.selectedPlan !== "public" || talent.paymentStatus !== "active") reason = "publication_disabled";
  else if (typeof talent.username !== "string" || !talent.username.trim()) reason = "username_missing";
  const published = reason === "published";
  return {
    subscriptionStatus,
    publicProfile: {
      status: published ? "published" : "unavailable",
      reason,
      // Relative same-origin destination; never expose a provider or configurable redirect.
      url: published ? `/${encodeURIComponent(talent.username.trim())}` : null,
    },
  };
}
