import { previewSubscriptionDowngrade, recordSubscriptionDowngrade } from "../services/subscriptionLifecycle.js";

const respond = async (req, res, recording) => {
  res.set("Cache-Control", "private, no-store");
  try {
    if (recording && (!req.body || Object.keys(req.body).some(key => !["previewToken", "toPlan"].includes(key)))) {
      return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "Only the preview token and lower plan may be supplied." });
    }
    const target = { role: req.params.role, accountId: req.params.accountId, adminId: String(req.user._id) };
    const result = recording ? await recordSubscriptionDowngrade({ ...target, previewToken: req.body.previewToken, toPlan: req.body.toPlan })
      : { success: true, ...await previewSubscriptionDowngrade(target) };
    return res.json(result);
  } catch (error) {
    const expected = typeof error.code === "string" && (error.code.startsWith("SUBSCRIPTION_") || error.code === "INVALID_SUBSCRIPTION_TARGET");
    return res.status(expected ? error.status : 503).json({ success: false,
      code: expected ? error.code : "SUBSCRIPTION_SERVICE_UNAVAILABLE",
      message: expected ? error.message : "Subscription service is unavailable. Refresh the confirmation before trying again.",
    });
  }
};
export const previewDowngrade = (req, res) => respond(req, res, false);
export const requestDowngrade = (req, res) => respond(req, res, true);
