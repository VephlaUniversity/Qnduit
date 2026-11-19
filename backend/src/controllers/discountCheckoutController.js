import { activateNoChargeSubscription } from "../services/subscriptionLifecycle.js";
import { initializeDiscountCheckout, readDiscountCheckout } from "../services/discountCheckout.js";
import { PLAN_REQUEST_ID } from "../utils/employerPlanRequest.js";
import { respondDiscountError } from "../services/discountQuote.js";

const validAttemptId = req => req.is("application/json") && req.body && typeof req.body === "object" &&
  !Array.isArray(req.body) && Object.keys(req.body).length === 1 &&
  typeof req.body.checkoutAttemptId === "string" && /^[a-f0-9]{64}$/.test(req.body.checkoutAttemptId);

const invalidAttempt = res => res.status(400).json({
  success: false, code: "DISCOUNT_CHECKOUT_INVALID_REQUEST", message: "Send only a valid saved checkout attempt ID.",
});

export async function createDiscountCheckout(req, res) {
  if (!validAttemptId(req)) return invalidAttempt(res);
  try {
    const result = await initializeDiscountCheckout(req.user, req.body.checkoutAttemptId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_CHECKOUT_UNCONFIRMED", message: "Checkout initialization could not be confirmed. Check this attempt again.",
    });
  }
}


export async function getDiscountCheckout(req, res) {
  const { idempotencyKey } = req.query;
  if (Object.keys(req.query).length !== 1 || typeof idempotencyKey !== "string" || !PLAN_REQUEST_ID.test(idempotencyKey)) {
    return res.status(400).json({ success: false, code: "DISCOUNT_CHECKOUT_INVALID_REQUEST", message: "Send only a valid saved checkout retry key." });
  }
  try {
    const attempt = await readDiscountCheckout(req.user, idempotencyKey.toLowerCase());
    return res.json({ success: true, attempt });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_CHECKOUT_STATUS_UNAVAILABLE", message: "Checkout status could not be loaded. Check again.",
    });
  }
}

export async function activateZeroDiscountCheckout(req, res) {
  if (!validAttemptId(req)) return invalidAttempt(res);
  try {
    const { grant, replayed } = await activateNoChargeSubscription({
      role: req.user.role, accountId: req.user._id, attemptId: req.body.checkoutAttemptId,
    });
    return res.json({ success: true, replayed, grant: { startsAt: grant.startsAt, endsAt: grant.endsAt } });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_NO_CHARGE_UNCONFIRMED", message: "No-charge activation could not be confirmed. Check the same attempt again.",
    });
  }
}
