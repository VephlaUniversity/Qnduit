import { resolveSubscriptionStatus } from "../services/subscriptionStatus.js";

export const EMPLOYER_MESSAGING_DENIED = "EMPLOYER_MESSAGING_DENIED";

export async function getEmployerMessagingAccess(req, res) {
  try {
    const status = await resolveSubscriptionStatus({ accountId: req.user._id, role: "employer" });
    res.set("Cache-Control", "private, no-store");
    return res.json({ success: true, allowed: status.eligibility.employerMessaging });
  } catch {
    return res.status(503).json({ message: "Messaging access could not be checked. Please try again." });
  }
}

export async function requireEmployerMessaging(req, res, next) {
  if (req.user.role === "talent") return next();
  if (req.user.role !== "employer") return res.status(403).json({ message: "Messaging is unavailable for this account." });
  try {
    const status = await resolveSubscriptionStatus({ accountId: req.user._id, role: "employer" });
    if (!status.eligibility.employerMessaging) {
      return res.status(403).json({ code: EMPLOYER_MESSAGING_DENIED,
        message: "Messaging requires an active Silver or Platinum subscription." });
    }
    return next();
  } catch {
    return res.status(503).json({ message: "Messaging access could not be checked. Please try again." });
  }
}
