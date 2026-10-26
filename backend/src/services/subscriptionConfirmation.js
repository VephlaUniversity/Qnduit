import mongoose from "mongoose";
import { setTimeout, clearTimeout } from "node:timers";
import Confirmation from "../models/SubscriptionConfirmation.js";
import { renderSubscriptionEmail } from "../utils/subscriptionEmailTemplate.js";
import { sendSubscriptionEmail } from "../utils/sendEmail.js";

export const confirmationId = (role, paymentId) => `confirmation:${role}:${paymentId}`;
const durable = { writeConcern: { w: "majority", j: true } };
const maxAttempts = 5;
const providerTimeoutMs = 15000;

// Called only inside the existing successful activation transaction. Capture
// database records, never callback fields or a later mutable subscription read.
export async function recordSubscriptionConfirmation({ role, account, payment, subscription, session }) {
  if (!session?.inTransaction() || String(payment[role]) !== String(account._id)
    || String(subscription[role]) !== String(account._id) || payment.status !== "successful"
    || payment.activationOutcome !== "activated" || subscription.status !== "active"
    || subscription.plan !== payment.plan || subscription.provider !== payment.provider
    || subscription.lastTxRef !== payment.txRef || subscription.lastTransactionId !== payment.transactionId) {
    throw new Error("Confirmation requires linked activation records in a transaction.");
  }
  await Confirmation.create([{
    _id: confirmationId(role, payment._id), role, account: account._id,
    payment: payment._id, subscription: subscription._id,
    snapshot: {
      recipient: account.email,
      name: (role === "talent" ? account.fullName : account.companyName || account.displayName)
        || [account.firstName, account.lastName].filter(Boolean).join(" ") || (role === "talent" ? "Talent" : "Employer"),
      plan: subscription.plan, amount: payment.amount, currency: payment.currency,
      reference: payment.txRef, transactionId: payment.transactionId, paidAt: payment.paidAt,
      periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd,
    },
  }], { session });
}

const date = value => {
  const parsed = value && new Date(value);
  if (!parsed || !Number.isFinite(parsed.getTime())) throw new Error("Invalid confirmation date");
  return parsed.toISOString().slice(0, 10);
};
function messageFor(event) {
  const data = event.snapshot;
  if (!data || typeof data.recipient !== "string" || data.recipient.length > 254
    || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(data.recipient)
    || !Number.isFinite(data.amount) || data.amount <= 0 || !/^[A-Z]{3}$/.test(data.currency || "")
    || !data.reference || !data.transactionId || !data.plan) throw new Error("Invalid confirmation evidence");
  return {
    to: data.recipient,
    // Stable provider correlation for manual reconciliation of uncertain sends.
    customArgs: { subscriptionConfirmationId: event._id },
    ...renderSubscriptionEmail({
      title: "Subscription confirmation",
      introduction: "Your payment was successful and your subscription was activated for the period below.",
      fields: [
        ["Account", data.name], ["Role", event.role === "talent" ? "Talent" : "Employer"], ["Plan", data.plan],
        ["Recorded payment amount", `${data.amount} ${data.currency}`],
        ["Payment reference", data.reference], ["Transaction ID", data.transactionId],
        ["Recorded payment date (UTC)", date(data.paidAt)],
        ["Subscription start (UTC)", date(data.periodStart)], ["Subscription end (UTC)", date(data.periodEnd)],
      ],
    }),
  };
}

async function boundedSend(send, message, timeoutMs) {
  let timer;
  try {
    // Timing out cannot prove rejection or cancel provider work. The caller
    // records uncertainty and never releases this event for automatic retry.
    return await Promise.race([
      Promise.resolve().then(() => send(message)),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Confirmation acceptance unconfirmed")), timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function dispatchSubscriptionConfirmation(id, {
  send = sendSubscriptionEmail, now = () => new Date(), timeoutMs = providerTimeoutMs,
} = {}) {
  // No lease expiry. A process crash after this durable claim may have sent an
  // email; sending/uncertain events require reconciliation, never a blind retry.
  const event = await Confirmation.findOneAndUpdate({ _id: id, status: "pending", nextAttemptAt: { $lte: now() } },
    { $set: { status: "sending", claimedAt: now() }, $inc: { attempts: 1 } }, { new: true, ...durable }).lean();
  if (!event) return { status: "skipped" };
  let message;
  try { message = messageFor(event); }
  catch {
    await Confirmation.updateOne({ _id: id, status: "sending" },
      { $set: { status: "failed", outcome: "invalid_evidence" } }, durable);
    return { status: "failed" };
  }
  let providerStatus;
  try {
    const response = await boundedSend(send, message, timeoutMs);
    providerStatus = Number(response?.[0]?.statusCode);
    if (providerStatus !== 202) throw new Error("Confirmation acceptance unconfirmed");
  } catch (error) {
    providerStatus = Number(error.response?.statusCode || error.response?.status || error.code || providerStatus);
    // Explicit 4xx rejection is safe to classify; timeouts, 5xx and transport
    // failures may have accepted the email. Only 429 is retried automatically.
    const rejected = providerStatus >= 400 && providerStatus < 500 && providerStatus !== 408;
    const retry = providerStatus === 429 && event.attempts < maxAttempts;
    const status = retry ? "pending" : rejected ? "failed" : "uncertain";
    await Confirmation.updateOne({ _id: id, status: "sending" }, { $set: {
      status, outcome: rejected ? "provider_rejected" : "acceptance_unconfirmed",
      ...(retry ? { nextAttemptAt: new Date(now().getTime() + Math.min(300000, 30000 * 2 ** (event.attempts - 1))) } : {}),
    } }, durable);
    return { status };
  }
  // If this write fails, keep the durable claim. Never turn an accepted but
  // unaudited email into a retryable pending event.
  await Confirmation.updateOne({ _id: id, status: "sending" },
    { $set: { status: "accepted", acceptedAt: now(), outcome: "provider_accepted" } }, durable);
  return { status: "accepted" };
}

export async function recoverSubscriptionConfirmations({ batchSize = 25, signal, ...options } = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) throw new Error("Invalid confirmation recovery bound");
  if (signal?.aborted) return;
  const events = await Confirmation.find({ status: "pending", nextAttemptAt: { $lte: options.now?.() || new Date() } })
    .sort({ nextAttemptAt: 1, _id: 1 }).limit(batchSize).select("_id").lean();
  for (const event of events) {
    if (signal?.aborted) break;
    try { await dispatchSubscriptionConfirmation(event._id, options); }
    catch { /* Database unavailable: keep pending intent or the durable claim. */ }
  }
}

export function startSubscriptionConfirmationRecovery() {
  const controller = new AbortController();
  let timer;
  async function tick() {
    try {
      if (mongoose.connection.readyState === 1) await recoverSubscriptionConfirmations({ signal: controller.signal });
    } catch { /* Retry the pending scan later; do not log billing or provider data. */ }
    if (!controller.signal.aborted) {
      timer = setTimeout(tick, 5000);
      timer.unref?.();
    }
  }
  timer = setTimeout(tick, 5000);
  timer.unref?.();
  return () => { controller.abort(); clearTimeout(timer); };
}
