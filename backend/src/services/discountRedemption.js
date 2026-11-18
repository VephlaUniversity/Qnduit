import DiscountCode, { discountCapacityUsed } from "../models/DiscountCode.js";
import { DiscountAccountSlot, DiscountCheckoutAttempt } from "../models/DiscountCheckoutAttempt.js";
import { planRequestHash } from "../utils/employerPlanRequest.js";
import { usdMinorUnits } from "../utils/subscriptionPrice.js";

// Called only inside the shared lifecycle transaction after a trusted provider
// verification. Returning a reason leaves the charge for reconciliation.
export async function redeemVerifiedDiscount({ payment, transaction, role, accountId, session }) {
  const metadata = payment.metadata;
  const attempt = await DiscountCheckoutAttempt.findById(metadata.discountCheckoutAttemptId).session(session).lean();
  if (!attempt || attempt.role !== role || String(attempt.account) !== String(accountId) ||
      attempt.code !== metadata.discountCode || attempt.codeRevision !== metadata.discountCodeRevision ||
      attempt.plan !== payment.plan || attempt.currency !== payment.currency ||
      attempt.originalMinor !== metadata.originalMinor || attempt.discountMinor !== metadata.discountMinor ||
      attempt.payableMinor !== metadata.payableMinor || !Number.isSafeInteger(attempt.payableMinor) ||
      attempt.payableMinor <= 0 || usdMinorUnits(payment.amount) !== attempt.payableMinor ||
      attempt.initialization?.txRef !== payment.txRef || String(attempt.initialization.payment) !== String(payment._id) ||
      !["initializing", "ready", "unconfirmed"].includes(attempt.initialization.state) || attempt.upgrade) {
    return "discount_attempt_invalid";
  }
  if (attempt.status !== "held") return attempt.status === "released" ? "discount_attempt_released" : "discount_attempt_invalid";
  if (attempt.redemptionTransactionId || attempt.redeemedAt) return "discount_attempt_invalid";
  return redeemHeldDiscount({ attempt, role, accountId, session,
    redemption: { redemptionTransactionId: String(transaction.id), redeemedAt: new Date() } });
}

export async function redeemHeldDiscount({ attempt, role, accountId, session, redemption }) {
  const slotId = planRequestHash(["discount-account-slot-v1", attempt.code, role, String(accountId)]);
  if (!await DiscountAccountSlot.exists({ _id: slotId, attempt: attempt._id }).session(session)) {
    return "discount_account_slot_missing";
  }
  const capacity = await DiscountCode.updateOne({
    _id: attempt.code, heldUses: { $gte: 1 }, $expr: { $lte: [discountCapacityUsed, "$maxTotalUses"] },
  }, { $inc: { heldUses: -1, successfulUses: 1 } }, { session, timestamps: false });
  if (capacity.modifiedCount !== 1) return "discount_capacity_requires_reconciliation";

  const moved = await DiscountCheckoutAttempt.updateOne({ _id: attempt._id, status: "held" }, { $set: {
    status: "redeemed", ...redemption,
  } }, { session });
  if (moved.modifiedCount !== 1) throw new Error("The held discount changed during finalization.");
  return null;
}

// A distinct charge sharing the initial reference requires reconciliation at
// the normal recurring terms. It never changes the initial payment or hold.
export function discountedChargeOutcome(payment, transaction) {
  const renewal = payment.transactionId && String(payment.transactionId) !== String(transaction.id);
  const terms = payment.metadata?.recurringTerms;
  const expected = renewal ? terms?.amountMinor : payment.metadata?.payableMinor;
  const currency = renewal ? terms?.currency : payment.currency;
  const amount = usdMinorUnits(transaction.amount);
  const matches = Number.isSafeInteger(expected) && expected > 0 && currency === transaction.currency &&
    amount !== null && amount >= expected && (renewal || usdMinorUnits(payment.amount) === expected);
  if (renewal) return matches ? "renewal_requires_reconciliation" : "discount_renewal_terms_mismatch";
  return matches ? null : "discount_payment_terms_mismatch";
}
