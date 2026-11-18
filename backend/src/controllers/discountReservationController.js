import { discountFailure, parseDiscountCheckout, respondDiscountError } from "../services/discountQuote.js";
import { holdDiscountForCheckout } from "../services/discountReservation.js";

export async function reserveDiscount(req, res) {
  try {
    if (!req.is("application/json")) {
      throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", "Send discount reservation details as JSON.");
    }
    const input = parseDiscountCheckout(req.body, req.user.role, true);
    const { attempt, replayed } = await holdDiscountForCheckout(req.user, input);
    const { _id, status, code, codeRevision, plan, currency, originalMinor, discountMinor, payableMinor } = attempt;
    return res.status(replayed ? 200 : 201).json({
      success: true, reservationOnly: true, replayed,
      reservation: { checkoutAttemptId: _id, status, code, codeRevision, plan, currency, originalMinor, discountMinor, payableMinor },
    });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_RESERVATION_UNAVAILABLE", message: "The reservation could not be confirmed. Retry the same checkout details with the same key.",
    });
  }
}
