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
  const accountReason = reason;
  if (reason === "published") {
    if (!subscriptionStatus.eligibility.talentPublicProfile) reason = subscriptionStatus.reason;
    // Preserve the paid publication/CV contract independently of free portfolios.
    else if (!talent.publicProfileEnabled || talent.selectedPlan !== "public" || talent.paymentStatus !== "active") reason = "publication_disabled";
    else if (typeof talent.username !== "string" || !talent.username.trim()) reason = "username_missing";
  }
  const published = reason === "published";
  // Portfolio publication is free. Paid lifecycle tracking is deliberately not a
  // publication switch here: cancellation/downgrade clears those flags. The
  // owner's showProfile choice and all account protections still apply.
  let portfolioReason = accountReason;
  if (portfolioReason === "published") {
    if (["account_missing", "account_inactive"].includes(subscriptionStatus.reason)) portfolioReason = subscriptionStatus.reason;
    else if (typeof talent.username !== "string" || !talent.username.trim()) portfolioReason = "username_missing";
    else if (talent.username.length > 160) portfolioReason = "username_invalid";
  }
  const portfolioPublished = portfolioReason === "published";
  return {
    subscriptionStatus,
    publicPortfolio: {
      status: portfolioPublished ? "published" : "unavailable",
      reason: portfolioReason,
      url: portfolioPublished ? `/${encodeURIComponent(talent.username.trim())}` : null,
      requiresQnduitBranding: !subscriptionStatus.eligibility.talentPublicProfile,
    },
    publicProfile: {
      status: published ? "published" : "unavailable",
      reason,
      // Relative same-origin destination; never expose a provider or configurable redirect.
      url: published ? `/${encodeURIComponent(talent.username.trim())}` : null,
    },
  };
}
