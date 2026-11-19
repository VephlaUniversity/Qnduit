import mongoose from "mongoose";
import DiscountCode, { discountCapacityUsed, discountRevisionFilter } from "../models/DiscountCode.js";
import { DiscountAccountSlot, DiscountCheckoutAttempt } from "../models/DiscountCheckoutAttempt.js";
import Employer from "../models/Employer.js";
import Talent from "../models/Talent.js";
import { planRequestHash } from "../utils/employerPlanRequest.js";
import { discountFailure as fail, resolveDiscountCheckout } from "./discountQuote.js";

const models = { talent: Talent, employer: Employer };
const transactionOptions = { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" };
const accountConflict = () => fail(409, "DISCOUNT_ACCOUNT_ALREADY_OCCUPIED", "Your account already holds or has used this discount code.");

function replay(attempt, fingerprint) {
  if (attempt.requestFingerprint !== fingerprint) {
    throw fail(409, "DISCOUNT_RESERVATION_KEY_CONFLICT", "This idempotency key belongs to different checkout details.");
  }
  return { attempt, replayed: true };
}

export function discountAttemptId(role, accountId, idempotencyKey) {
  return planRequestHash(["discount-checkout-v1", role, String(accountId), idempotencyKey]);
}

export async function holdDiscountForCheckout(user, input) {
  const role = user.role;
  const accountId = String(user._id);
  const { code, plan, previewToken, idempotencyKey, firstEmployerPurchase } = input;
  // The browser supplies a retry key. The server derives the actual attempt and
  // account-slot identifiers, scoped to the authenticated principal.
  const attemptId = discountAttemptId(role, accountId, idempotencyKey);
  const slotId = planRequestHash(["discount-account-slot-v1", code, role, accountId]);
  const fingerprint = planRequestHash([code, plan, previewToken ?? null, ...(firstEmployerPurchase ? [true] : [])]);
  let session;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(async () => {
      const previous = await DiscountCheckoutAttempt.findById(attemptId).session(session).lean();
      if (previous) return replay(previous, fingerprint);

      const account = await models[role].findById(accountId).select("_id accountStatus isVerified paymentStatus paystackReference planExpiresAt").session(session).lean();
      if (!account) throw fail(403, "SUBSCRIPTION_CHECKOUT_DENIED", "An active account with confirmed email is required.");
      const { pricing, discount, upgrade } = await resolveDiscountCheckout({ ...account, role }, input, session);
      try {
        await DiscountAccountSlot.create([{ _id: slotId, attempt: attemptId }], { session });
      } catch (error) {
        if (error.code === 11000) error.duplicateDiscountSlot = true;
        throw error;
      }
      const codeRevision = discount.revision ?? 0;
      const now = new Date();
      if (now >= discount.expiresAt) throw fail(400, "DISCOUNT_CODE_EXPIRED", "This discount code has expired.");
      // The code row is the shared write target for both reservations and cap edits.
      const capacity = await DiscountCode.updateOne({
        _id: code, ...discountRevisionFilter(codeRevision),
        $expr: { $lt: [discountCapacityUsed, "$maxTotalUses"] },
      }, { $inc: { heldUses: 1 } }, { session, timestamps: false });
      if (!capacity.modifiedCount) throw fail(409, "DISCOUNT_CAPACITY_UNAVAILABLE", "This discount code has no available uses.");

      const [attempt] = await DiscountCheckoutAttempt.create([{
        _id: attemptId, requestFingerprint: fingerprint, account: accountId, role, codeRevision, terms: discount.terms,
        ...pricing, upgrade, ...(firstEmployerPurchase ? { firstEmployerPurchase: true } : {}), status: "held", releaseCheckAt: new Date(now.getTime() + 30 * 60_000),
      }], { session });
      return { attempt, replayed: false };
    }, transactionOptions);
  } catch (error) {
    if (error.code === 20) {
      throw fail(503, "DISCOUNT_TRANSACTIONS_REQUIRED", "Discount reservations require a transaction-capable database.");
    }
    if (error.code === 11000) {
      // A concurrent insert may have committed the same attempt while this
      // transaction aborted. Read the committed result before reporting conflict.
      const previous = await DiscountCheckoutAttempt.findById(attemptId).lean();
      if (previous) return replay(previous, fingerprint);
      if (error.duplicateDiscountSlot) throw accountConflict();
    }
    throw error;
  } finally {
    await session?.endSession();
  }
}
