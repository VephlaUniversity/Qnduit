import mongoose from "mongoose";
import DiscountCode from "../models/DiscountCode.js";
import { DiscountAccountSlot, DiscountCheckoutAttempt } from "../models/DiscountCheckoutAttempt.js";
import { SubscriptionCharge, SubscriptionLifecycle } from "../models/SubscriptionLifecycle.js";
import { planRequestHash } from "../utils/employerPlanRequest.js";
import { discountFailure as fail } from "./discountQuote.js";
import { readDiscountReleaseEvidence } from "./discountReleaseEvidence.js";
import { withSubscriptionLifecycleTransaction } from "./subscriptionLifecycle.js";

const notTerminal = () => fail(409, "DISCOUNT_RELEASE_NOT_TERMINAL", "Terminal checkout evidence is unavailable. The reservation remains held.");
const successful = () => fail(409, "DISCOUNT_RELEASE_SUCCESSFUL", "A successful charge or redemption prevents release.");
const inconsistent = () => fail(503, "DISCOUNT_RELEASE_ACCOUNTING_UNAVAILABLE", "Reservation accounting could not be reconciled.");

function checkAttempt(attempt) {
  if (!attempt) throw fail(404, "DISCOUNT_ATTEMPT_NOT_FOUND", "Discount checkout attempt not found.");
  if (attempt.status === "redeemed" || attempt.redemptionTransactionId || attempt.redeemedAt) throw successful();
}

function released(attempt, release, replayed) {
  return { checkoutAttemptId: attempt._id, status: "released", reason: release?.reason ?? null,
    releasedAt: release?.releasedAt ?? null, replayed };
}

async function terminalEvidence(initialization) {
  if (!initialization || !["ready", "rejected"].includes(initialization.state)) throw notTerminal();
  const proof = await readDiscountReleaseEvidence(initialization);
  if (proof?.txRef !== initialization.txRef || proof?.cannotCollect !== true || proof?.hasSuccessfulCharge !== false ||
      !["failed", "expired", "disabled"].includes(proof.terminalState) ||
      typeof proof.evidenceId !== "string" || !/^[\w:.-]{1,128}$/.test(proof.evidenceId)) throw notTerminal();
  return { txRef: proof.txRef, terminalState: proof.terminalState, evidenceId: proof.evidenceId };
}

export async function releaseDiscountReservation(user, attemptId, { dueBy } = {}) {
  const { role, _id: accountId } = user;
  const selection = { _id: attemptId, role, account: accountId };
  const observed = await DiscountCheckoutAttempt.findOne(selection).lean();
  checkAttempt(observed);
  if (observed.status === "released") return released(observed, observed.release, true);
  if (dueBy && !(observed.releaseCheckAt instanceof Date && observed.releaseCheckAt <= dueBy)) throw notTerminal();
  const initialization = observed.initialization;
  const evidence = initialization === undefined ? undefined : await terminalEvidence(initialization);
  const release = { reason: evidence ? "provider_terminal" : "never_initialized", releasedAt: new Date(), evidence };

  return withSubscriptionLifecycleTransaction(role, accountId, async ({ Payment, state, session }) => {
    const current = await DiscountCheckoutAttempt.findOne(selection).session(session).lean();
    checkAttempt(current);
    if (current.status === "released") return released(current, current.release, true);
    if (dueBy && !(current.releaseCheckAt instanceof Date && current.releaseCheckAt <= dueBy)) throw notTerminal();
    let observedState = { initialization: { $exists: false } };
    if (evidence) {
      const init = current.initialization;
      if (!init || init.state !== initialization.state || init.txRef !== evidence.txRef ||
          String(init.payment) !== String(initialization.payment) || init.checkoutUrl !== initialization.checkoutUrl) throw notTerminal();
      const payment = await Payment.findOne({ _id: init.payment, [role]: accountId, txRef: init.txRef,
        "metadata.discountCheckoutAttemptId": attemptId }).session(session).lean();
      if (!payment) throw inconsistent();
      if (!["pending", "failed"].includes(payment.status) || payment.transactionId || payment.paidAt ||
          await SubscriptionCharge.exists({ txRef: init.txRef }).session(session)) throw successful();
      observedState = { "initialization.state": init.state, "initialization.txRef": init.txRef, "initialization.payment": init.payment };
      await Payment.updateOne({ _id: payment._id, status: "pending" },
        { $set: { status: "failed", failureReason: "discount_checkout_terminal" } }, { session });
      await SubscriptionLifecycle.updateOne({ _id: state._id, pendingPayment: payment._id },
        { $unset: { pendingPayment: 1 } }, { session });
    }
    const changed = await DiscountCheckoutAttempt.updateOne({ ...selection, ...observedState, status: "held" },
      { $set: { status: "released", release }, $unset: { releaseCheckAt: 1 } }, { session, runValidators: true });
    if (changed.modifiedCount !== 1) throw notTerminal();
    const capacity = await DiscountCode.updateOne({ _id: current.code, heldUses: { $gte: 1 } },
      { $inc: { heldUses: -1 } }, { session, timestamps: false });
    const slotId = planRequestHash(["discount-account-slot-v1", current.code, role, String(accountId)]);
    const slot = await DiscountAccountSlot.deleteOne({ _id: slotId, attempt: attemptId }, { session });
    if (capacity.modifiedCount !== 1 || slot.deletedCount !== 1) throw inconsistent();
    return released(current, release, false);
  }, { allowMissingAccount: true });
}

export async function recoverDiscountReservations({ signal, now = new Date() } = {}) {
  const pending = await DiscountCheckoutAttempt.find({ status: "held", releaseCheckAt: { $lte: now } })
    .sort({ releaseCheckAt: 1, _id: 1 }).limit(25).select("role account releaseCheckAt").lean();
  for (const attempt of pending) {
    if (signal?.aborted) return;
    try {
      await releaseDiscountReservation({ role: attempt.role, _id: attempt.account }, attempt._id, { dueBy: now });
    } catch {
      if (signal?.aborted) return;
      await DiscountCheckoutAttempt.updateOne({
        _id: attempt._id, status: "held", releaseCheckAt: attempt.releaseCheckAt,
      }, { $set: { releaseCheckAt: new Date(now.getTime() + 15 * 60_000) } });
    }
  }
}

export function startDiscountReservationRecovery() {
  const controller = new AbortController();
  let timer;
  async function tick() {
    try {
      if (mongoose.connection.readyState === 1) await recoverDiscountReservations({ signal: controller.signal });
    } catch { /* The next scan can retry without advancing any checkout. */ }
    if (!controller.signal.aborted) {
      timer = setTimeout(tick, 60_000);
      timer.unref();
    }
  }
  timer = setTimeout(tick, 60_000);
  timer.unref();
  return () => { controller.abort(); clearTimeout(timer); };
}
