
import {
  previewOwnSubscriptionCancellation,
  cancelOwnSubscription,
} from "../services/subscriptionLifecycle.js";

const respond = async (req, res, cancelling) => {
  res.set("Cache-Control", "private, no-store");

  try {
    if (
      cancelling &&
      (!req.body ||
        Object.keys(req.body).some(
          (key) => !["previewToken", "requestId"].includes(key),
        ))
    ) {
      return res.status(400).json({
        success: false,
        code: "SUBSCRIPTION_REQUEST_INVALID",
        message:
          "Only the preview token and request ID may be supplied.",
      });
    }

    // Role and account ownership always come from verified authentication.
    const role = req.user.role;
    const accountId = String(req.user._id);

    if (!["talent", "employer"].includes(role)) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_CANCELLATION_DENIED",
        message: "Only Talent and Employer accounts can cancel here.",
      });
    }

    const result = cancelling
      ? await cancelOwnSubscription({
          role,
          accountId,
          previewToken: req.body.previewToken,
          requestId: req.body.requestId,
        })
      : await previewOwnSubscriptionCancellation({
          role,
          accountId,
        });

    return res.json({ success: true, ...result });
  } catch (error) {
    const expected =
      typeof error.code === "string" &&
      (error.code.startsWith("SUBSCRIPTION_") ||
        error.code === "INVALID_SUBSCRIPTION_TARGET");

    return res.status(expected ? error.status : 503).json({
      success: false,
      code: expected
        ? error.code
        : "SUBSCRIPTION_SERVICE_UNAVAILABLE",
      message: expected
        ? error.message
        : "Subscription service is unavailable. Please try again.",
    });
  }
};

export const previewOwnCancellation = (req, res) =>
  respond(req, res, false);

export const confirmOwnCancellation = (req, res) =>
  respond(req, res, true);
