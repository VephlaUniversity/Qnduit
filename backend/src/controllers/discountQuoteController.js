import {
  checkoutPrice, discountFailure, parseDiscountCheckout, resolveDiscountCheckout, respondDiscountError,
} from "../services/discountQuote.js";

export { buildDiscountQuote } from "../services/discountQuote.js";

export async function quoteDiscount(req, res) {
  try {
    if (!req.is("application/json")) {
      throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", "Send only the code, plan, and Employer upgrade preview token when applicable.");
    }
    const input = parseDiscountCheckout(req.body, req.user.role);
    const { discount, pricing, firstEmployerPurchase } = await resolveDiscountCheckout(req.user, input);
    const { maxTotalUses, heldUses = 0, successfulUses = 0 } = discount;
    if (!Number.isSafeInteger(maxTotalUses) || maxTotalUses < 1 ||
        ![heldUses, successfulUses].every(value => Number.isSafeInteger(value) && value >= 0) ||
        heldUses + successfulUses >= maxTotalUses) {
      throw discountFailure(409, "DISCOUNT_CAPACITY_UNAVAILABLE", "This discount code has no available uses.");
    }
    return res.json({ success: true, quoteOnly: true, quote: pricing, ...(firstEmployerPurchase ? { firstEmployerPurchase: true } : {}) });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_QUOTE_UNAVAILABLE", message: "The discount quote could not be loaded. Please try again.",
    });
  }
}


export function getCheckoutPrice(req, res) {
  try {
    if (Object.keys(req.query).length !== 1 || typeof req.query.plan !== "string") {
      throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", "Send only the selected plan.");
    }
    return res.json({ success: true, price: checkoutPrice(req.user.role, req.query.plan) });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_QUOTE_PRICE_UNAVAILABLE", message: "The price for this plan is unavailable.",
    });
  }
}
