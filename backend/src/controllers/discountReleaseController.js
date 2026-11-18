import { releaseDiscountReservation } from "../services/discountRelease.js";
import { respondDiscountError } from "../services/discountQuote.js";

export async function releaseDiscount(req, res) {
  const { body } = req;
  if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof body.checkoutAttemptId !== "string" || !/^[a-f0-9]{64}$/.test(body.checkoutAttemptId)) {
    return res.status(400).json({ success: false, code: "DISCOUNT_RELEASE_INVALID_REQUEST", message: "Send only a valid saved checkout attempt ID." });
  }
  try {
    const result = await releaseDiscountReservation(req.user, body.checkoutAttemptId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return respondDiscountError(res, error, {
      code: "DISCOUNT_RELEASE_UNCONFIRMED", message: "Reservation release could not be confirmed. Check this attempt again.",
    });
  }
}
