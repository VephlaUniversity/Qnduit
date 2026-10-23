import { previewSubscriptionCancellation, cancelSubscription } from "../services/subscriptionLifecycle.js";

const respond = async (req, res, cancelling) => {
  res.set("Cache-Control", "private, no-store");
  try {
    if (cancelling && (!req.body || Object.keys(req.body).some(key => !["previewToken", "requestId"].includes(key)))) {
      return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "Only the preview token and request ID may be supplied." });
    }
    const target = { role: req.params.role, accountId: req.params.accountId, adminId: String(req.user._id) };
    const result = cancelling ? await cancelSubscription({ ...target, previewToken: req.body.previewToken, requestId: req.body.requestId })
      : { success: true, ...await previewSubscriptionCancellation(target) };
    return res.json(result);
  } catch (error) {
    const expected = typeof error.code === "string" && (error.code.startsWith("SUBSCRIPTION_") || error.code === "INVALID_SUBSCRIPTION_TARGET");
    return res.status(expected ? error.status : 503).json({ success: false,
      code: expected ? error.code : "SUBSCRIPTION_SERVICE_UNAVAILABLE",
      message: expected ? error.message : "Subscription service is unavailable. Refresh the confirmation before trying again.",
    });
  }
};
export const previewCancellation = (req, res) => respond(req, res, false);
export const cancelActiveSubscription = (req, res) => respond(req, res, true);
