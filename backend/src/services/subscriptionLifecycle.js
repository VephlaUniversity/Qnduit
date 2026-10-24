import mongoose from "mongoose";
import process from "node:process";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { loadSubscriptionEvidence, subscriptionStatusFromEvidence } from "./subscriptionStatus.js";
import Talent from "../models/Talent.js";
import Employer from "../models/Employer.js";
import TalentSubscription from "../models/TalentSubscription.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";
import { SubscriptionLifecycle as Lifecycle, SubscriptionCancellation as Cancellation, SubscriptionCharge as Charge, SubscriptionDowngrade as Downgrade } from "../models/SubscriptionLifecycle.js";

const adapters = {
  talent: { Account: Talent, Subscription: TalentSubscription, Payment: TalentPayment, plans: ["public"] },
  employer: { Account: Employer, Subscription: EmployerSubscription, Payment: EmployerPayment, plans: ["bronze", "silver", "platinum"] },
};
const failure = (status, code, message) => Object.assign(new Error(message), { status, code });
const adapterForRole = role => {
  if (!Object.hasOwn(adapters, role)) throw failure(400, "INVALID_SUBSCRIPTION_TARGET", "A valid account role is required.");
  return adapters[role];
};
const target = (role, accountId) => {
  if (!Object.hasOwn(adapters, role) || !/^[a-f\d]{24}$/i.test(String(accountId))) throw failure(400, "INVALID_SUBSCRIPTION_TARGET", "A valid account role and ID are required.");
  return adapters[role];
};
const generation = state => state?.generation || 0;
const key = (role, accountId) => `${role}:${String(accountId).toLowerCase()}`;
const linked = (subscription, payment) => Boolean(subscription && (subscription.lastTxRef || subscription.lastTransactionId)
  && subscription.plan === payment.plan && subscription.provider === payment.provider
  && (!subscription.lastTxRef || subscription.lastTxRef === payment.txRef)
  && (!subscription.lastTransactionId || subscription.lastTransactionId === payment.transactionId));
const fingerprint = (subscription, state) => createHash("sha256").update(JSON.stringify({
  id: String(subscription._id), generation: generation(state), status: subscription.status, plan: subscription.plan,
  provider: subscription.provider, start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd,
  lastTxRef: subscription.lastTxRef, lastTransactionId: subscription.lastTransactionId, updatedAt: subscription.updatedAt,
})).digest("hex");

async function serialized(role, accountId, work) {
  const adapter = target(role, accountId), id = key(role, accountId);
  // Creating an empty guard does not change paid access. _id is always unique.
  try { await Lifecycle.updateOne({ _id: id }, { $setOnInsert: { generation: 0, version: 0 } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const state = await Lifecycle.findByIdAndUpdate(id, { $inc: { version: 1 } }, { new: true, session }).lean();
      const account = await adapter.Account.findById(accountId).session(session);
      if (!account) throw failure(404, "SUBSCRIPTION_ACCOUNT_MISSING", "Account not found.");
      return work({ ...adapter, session, state, account });
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
  } catch (error) {
    if (error.code === 20) throw failure(503, "SUBSCRIPTION_TRANSACTIONS_REQUIRED", "Subscription updates require a transaction-capable database.");
    throw error;
  } finally { await session.endSession(); }
}

export async function initiateSubscriptionCheckout({ role, accountId, plan, txRef, amount, currency, paymentPlanId }) {
  target(role, accountId);
  // Observe permission before waiting for the writer lock. A checkout already
  // in flight when cancellation commits must not become a post-cancel checkout.
  const observed = generation(await Lifecycle.findById(key(role, accountId)).select("generation").lean());
  return serialized(role, accountId, async ({ Account, Subscription, Payment, account, state, session, plans }) => {
    if (generation(state) !== observed) throw failure(409, "SUBSCRIPTION_CHECKOUT_STALE", "Subscription state changed. Start a new checkout deliberately.");
    if (account.accountStatus !== "active" || !account.isVerified) throw failure(403, "SUBSCRIPTION_CHECKOUT_DENIED", "An active account with confirmed email is required.");
    if (!plans.includes(plan)) throw failure(400, "SUBSCRIPTION_PLAN_INVALID", "Invalid subscription plan.");
    const current = await Subscription.findOne({ [role]: accountId, status: { $in: role === "talent" ? ["active", "past_due"] : ["active"] } }).session(session);
    if (current) throw failure(409, "SUBSCRIPTION_ALREADY_ACTIVE", "You already have an active subscription.");
    if (!Number.isSafeInteger(paymentPlanId) || paymentPlanId <= 0 || !Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) throw failure(503, "SUBSCRIPTION_CHECKOUT_CONFIGURATION", "Payment configuration is unavailable.");
    const nextGeneration = generation(state) + 1;
    const [payment] = await Payment.create([{ [role]: accountId, provider: "flutterwave", txRef, amount, currency, plan,
      type: "subscription", status: "pending", activationGeneration: nextGeneration,
      metadata: { [role + "Id"]: String(accountId), plan, paymentPlanId } }], { session });
    await Lifecycle.updateOne({ _id: state._id }, { $set: { generation: nextGeneration, pendingPayment: payment._id } }, { session });
    await Account.updateOne({ _id: accountId }, { $set: { selectedPlan: plan, paymentStatus: "pending" } }, { session });
    return { paymentId: String(payment._id), generation: nextGeneration };
  });
}

// Free/pay-later selections are tracking changes, never activation permission.
export async function selectUnpaidSubscription({ role, accountId, plan }) {
  return serialized(role, accountId, async ({ Account, Subscription, account, session }) => {
    if (!(role === "talent" ? plan === "free" : adapters.employer.plans.includes(plan))) throw failure(400, "SUBSCRIPTION_PLAN_INVALID", "Invalid plan.");
    if (!account.isVerified || account.accountStatus !== "active") throw failure(403, "SUBSCRIPTION_CHECKOUT_DENIED", "An active account with confirmed email is required.");
    if (await Subscription.exists({ [role]: accountId, status: "active" }).session(session)) throw failure(409, "SUBSCRIPTION_ALREADY_ACTIVE", "An active subscription cannot be replaced by an unpaid selection.");
    await Account.updateOne({ _id: accountId }, { $set: { selectedPlan: plan, paymentStatus: role === "talent" ? "none" : "pending" } }, { session });
  });
}

async function retainCharge(transaction, ownership = {}, session = null) {
  const amount = Number(transaction?.amount);
  if (!transaction?.id || transaction.status !== "successful" || typeof transaction.tx_ref !== "string" || !transaction.tx_ref
    || !Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(transaction.currency || "")) throw failure(400, "SUBSCRIPTION_PAYMENT_VERIFICATION_FAILED", "Payment verification failed.");
  const id = `flutterwave:${transaction.id}`;
  const prior = await Charge.findById(id).session(session).lean();
  if (prior && (prior.txRef !== transaction.tx_ref || prior.amount !== amount || prior.currency !== transaction.currency
    || prior.payment && ownership.payment && String(prior.payment) !== String(ownership.payment))) throw failure(409, "SUBSCRIPTION_PAYMENT_CONFLICT", "Payment evidence conflicts with an existing transaction.");
  await Charge.updateOne({ _id: id }, { $setOnInsert: { transactionId: String(transaction.id), txRef: transaction.tx_ref,
    amount, currency: transaction.currency, flwRef: transaction.flw_ref, ...ownership } }, { upsert: true, session });
}
export const recordUnlinkedSubscriptionCharge = transaction => retainCharge(transaction, { outcome: "unlinked_requires_reconciliation" });

export async function activateVerifiedSubscription({ role, paymentId, transaction }) {
  const { Payment } = adapterForRole(role);
  const owner = await Payment.findById(paymentId).select(role).lean();
  if (!owner) throw failure(404, "SUBSCRIPTION_PAYMENT_MISSING", "Payment not found.");
  return serialized(role, owner[role], async ({ Account, Subscription, Payment, account, state, session }) => {
    const payment = await Payment.findById(paymentId).session(session);
    const amount = Number(transaction?.amount);
    if (!transaction?.id || transaction.status !== "successful" || transaction.tx_ref !== payment.txRef
      || transaction.currency !== payment.currency || !Number.isFinite(payment.amount) || payment.amount <= 0 || !Number.isFinite(amount) || amount < payment.amount) {
      throw failure(400, "SUBSCRIPTION_PAYMENT_VERIFICATION_FAILED", "Payment verification failed.");
    }
    await retainCharge(transaction, { role, account: account._id, payment: payment._id, outcome: "verified" }, session);
    // A renewal may reuse the checkout reference but has a distinct transaction.
    // Preserve its evidence separately; it cannot overwrite the original payment.
    if (payment.transactionId && String(payment.transactionId) !== String(transaction.id)) {
      return { recorded: true, activated: false, reason: "renewal_requires_reconciliation" };
    }
    const current = await Subscription.findOne({ [role]: account._id }).session(session);
    if (["successful", "refunded"].includes(payment.status)) {
      // Legacy successful records can be read/replayed but never grant access
      // afresh. No paidAt, period, references or account flags are rewritten.
      return { recorded: true, activated: payment.status === "successful" && account.isVerified &&
        subscriptionStatusFromEvidence({ account, subscription: current, payment: linked(current, payment) ? payment : null }, { role }).paidEligible,
      reason: "already_recorded", replayed: true };
    }
    const now = new Date();
    payment.status = "successful";
    payment.paidAt = payment.paidAt || now;
    payment.transactionId = String(transaction.id);
    payment.flwRef = transaction.flw_ref;
    payment.metadata = { ...(payment.metadata || {}), flutterwaveStatus: transaction.status,
      paymentType: transaction.payment_type, chargedAmount: transaction.charged_amount };
    let reason;
    if (!Number.isSafeInteger(payment.activationGeneration)) reason = "legacy_checkout_without_generation";
    else if (!adapters[role].plans.includes(payment.plan) || !Number.isSafeInteger(payment.metadata?.paymentPlanId) || payment.metadata.paymentPlanId <= 0) reason = "invalid_checkout_evidence";
    else if (payment.type !== "subscription") reason = "not_explicit_checkout";
    else if (payment.activationGeneration !== generation(state) || String(state.pendingPayment || "") !== String(payment._id)) reason = "superseded_checkout";
    else if (account.accountStatus !== "active" || !account.isVerified) reason = "account_unavailable";
    else if (current?.status === "active") reason = "newer_or_existing_activation";
    payment.activationOutcome = reason || "activated";
    await payment.save({ session });
    if (reason) return { recorded: true, activated: false, reason };
    const end = new Date(now); end.setMonth(end.getMonth() + 1); // Preserve existing period semantics.
    await Subscription.findOneAndUpdate({ [role]: account._id }, { $set: {
      [role]: account._id, provider: payment.provider, plan: payment.plan, status: "active",
      currentPeriodStart: now, currentPeriodEnd: end, cancelAtPeriodEnd: false,
      canceledAt: null, endedAt: null, lastTxRef: payment.txRef, lastTransactionId: payment.transactionId,
      ...(role === "talent" ? { flutterwavePlanId: String(payment.metadata.paymentPlanId), flutterwaveCustomerEmail: account.email } : {}),
    } }, { new: true, upsert: true, runValidators: true, session });
    const tracking = { selectedPlan: payment.plan, paymentStatus: "active" };
    if (role === "talent") {
      tracking.publicProfileEnabled = true;
      if (!account.username) {
        const name = account.fullName || `${account.firstName || ""} ${account.lastName || ""}`;
        const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        tracking.username = `${slug || "talent"}-${String(account._id).slice(-6)}`;
      }
    } else { tracking.planExpiresAt = end; tracking.isTrial = false; }
    await Account.updateOne({ _id: account._id }, { $set: tracking }, { session });
    await Lifecycle.updateOne({ _id: state._id }, { $set: { activePayment: payment._id, pendingPayment: null } }, { session });
    return { recorded: true, activated: true, reason: "activated" };
  });
}

export async function recordFailedSubscriptionPayment({ role, paymentId }) {
  // A late failure must never downgrade a successful/refunded payment or access.
  const adapter = adapterForRole(role);
  await adapter.Payment.updateOne({ _id: paymentId, status: { $nin: ["successful", "refunded"] } },
    { $set: { status: "failed", failureReason: "Payment verification failed" } });
}

const audience = "admin-subscription-cancel";
export async function previewSubscriptionCancellation({ role, accountId, adminId }) {
  accountId = String(accountId).toLowerCase();
  const { Account, Subscription } = target(role, accountId);
  const account = await Account.findById(accountId).select("firstName lastName fullName companyName displayName email").lean();
  if (!account) throw failure(404, "SUBSCRIPTION_ACCOUNT_MISSING", "Account not found.");
  const subscription = await Subscription.findOne({ [role]: accountId, status: "active" }).sort({ currentPeriodStart: -1, createdAt: -1, _id: -1 }).lean();
  if (!subscription) throw failure(409, "SUBSCRIPTION_NOT_ACTIVE", "No active subscription is available to cancel.");
  const state = await Lifecycle.findById(key(role, accountId)).lean();
  const selection = fingerprint(subscription, state);
  return { subscription: { accountId, role, id: String(subscription._id), plan: subscription.plan,
    name: account.fullName || account.companyName || account.displayName || `${account.firstName || ""} ${account.lastName || ""}`.trim(), email: account.email || "" },
  previewToken: jwt.sign({ role, accountId, fingerprint: selection }, process.env.JWT_SECRET, { algorithm: "HS256", audience, subject: String(adminId), expiresIn: "10m" }) };
}

async function deactivate({ role, Account, Subscription, account, subscription, state, session, now }) {
  const updated = await Subscription.updateOne({ _id: subscription._id, [role]: account._id, status: "active" },
    { $set: { status: "canceled", cancelAtPeriodEnd: false, canceledAt: now, endedAt: now } }, { session });
  if (updated.matchedCount !== 1) throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "The active subscription changed.");
  const tracking = { selectedPlan: "free", paymentStatus: "cancelled", ...(role === "talent" ? { publicProfileEnabled: false } : { isTrial: false }) };
  await Account.updateOne({ _id: account._id }, { $set: tracking, ...(role === "employer" ? { $unset: { planExpiresAt: "", trialEndsAt: "" } } : {}) }, { session });
  await Lifecycle.updateOne({ _id: state._id }, { $set: { generation: generation(state) + 1, pendingPayment: null, activePayment: null } }, { session });
}

export async function cancelSubscription({ role, accountId, adminId, previewToken, requestId }) {
  accountId = String(accountId).toLowerCase();
  target(role, accountId);
  if (typeof requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestId)) throw failure(400, "SUBSCRIPTION_REQUEST_INVALID", "A valid request ID is required.");
  let selected;
  try { selected = jwt.verify(previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience, subject: String(adminId) }); }
  catch { throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "Refresh the subscription confirmation before cancelling."); }
  if (selected.role !== role || selected.accountId !== accountId) throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "The selected account changed. Refresh the confirmation.");
  return serialized(role, accountId, async context => {
    const { Subscription, state, session } = context;
    const previous = await Cancellation.findById(requestId).session(session).lean();
    if (previous) {
      if (previous.role !== role || String(previous.account) !== accountId || String(previous.admin) !== String(adminId) || previous.fingerprint !== selected.fingerprint) throw failure(409, "SUBSCRIPTION_REQUEST_CONFLICT", "This request ID belongs to a different cancellation.");
      const superseded = generation(state) !== previous.generation;
      return { success: true, status: "canceled", replayed: true, superseded,
        message: "Application subscription cancelled.",
        ...(superseded ? { notice: "The selected subscription was already cancelled. A newer subscription state was left unchanged." } : {}) };
    }
    const subscription = await Subscription.findOne({ [role]: accountId, status: "active" }).session(session).lean();
    if (!subscription || fingerprint(subscription, state) !== selected.fingerprint) throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "The active subscription changed. Refresh the confirmation.");
    const now = new Date();
    await deactivate({ ...context, role, subscription, now });
    await Lifecycle.updateOne({ _id: state._id }, { $set: { adminCanceledAt: now } }, { session });
    await Cancellation.create([{ _id: requestId, role, account: accountId, subscription: subscription._id, admin: adminId,
      fingerprint: selected.fingerprint, generation: generation(state) + 1, lastTxRef: subscription.lastTxRef,
      lastTransactionId: subscription.lastTransactionId, canceledAt: now }], { session });
    return { success: true, status: "canceled", replayed: false, message: "Application subscription cancelled." };
  });
}

export async function applyProviderSubscriptionCancellation({ txRef, transactionId }) {
  // Email is not an ownership/activation identifier. Unlinked provider events
  // require reconciliation; never apply them to whichever account shares email.
  if (typeof txRef !== "string" || !txRef) return { applied: false, reason: "unlinked_provider_subscription" };
  const matches = [];
  for (const role of Object.keys(adapters)) {
    const payment = await adapters[role].Payment.findOne({ txRef, ...(transactionId ? { transactionId: String(transactionId) } : {}) }).lean();
    if (payment) matches.push({ role, payment });
  }
  if (matches.length !== 1) return { applied: false, reason: "unmatched_or_ambiguous_provider_event" };
  const { role, payment } = matches[0];
  return serialized(role, payment[role], async context => {
    const subscription = await context.Subscription.findOne({ [role]: payment[role], status: "active" }).session(context.session).lean();
    if (!linked(subscription, payment)) return { applied: false, reason: "stale_provider_event" };
    await deactivate({ ...context, role, subscription, now: new Date() });
    return { applied: true };
  });
}


const lowerPlans = {
  talent: { public: ["free"] },
  employer: { platinum: ["silver", "bronze", "free"], silver: ["bronze", "free"], bronze: ["free"] },
};
const downgradeAudience = "admin-subscription-downgrade";
const downgradeId = (role, accountId, selection) => createHash("sha256").update(`${key(role, accountId)}:${selection}`).digest("hex");
const downgradeDto = record => record ? { id: String(record._id), fromPlan: record.fromPlan, toPlan: record.toPlan,
  status: record.status, requestedAt: new Date(record.requestedAt).toISOString() } : null;

async function downgradeEvidence(role, accountId, session = null) {
  const evidence = await loadSubscriptionEvidence({ role, accountId, session });
  if (!evidence.account) throw failure(404, "SUBSCRIPTION_ACCOUNT_MISSING", "Account not found.");
  if (!subscriptionStatusFromEvidence(evidence, { role }).paidEligible) throw failure(409, "SUBSCRIPTION_NOT_ACTIVE", "An active paid subscription is required to request a downgrade.");
  return evidence.subscription;
}

export async function previewSubscriptionDowngrade({ role, accountId, adminId }) {
  accountId = String(accountId).toLowerCase();
  const { Account } = target(role, accountId);
  const subscription = await downgradeEvidence(role, accountId);
  const account = await Account.findById(accountId).select("firstName lastName fullName companyName displayName email").lean();
  if (!account) throw failure(404, "SUBSCRIPTION_ACCOUNT_MISSING", "Account not found.");
  const state = await Lifecycle.findById(key(role, accountId)).lean(), selection = fingerprint(subscription, state);
  const pending = await Downgrade.findById(downgradeId(role, accountId, selection)).lean();
  return { subscription: { accountId, role, id: String(subscription._id), plan: subscription.plan,
    name: account.fullName || account.companyName || account.displayName || `${account.firstName || ""} ${account.lastName || ""}`.trim(), email: account.email || "" },
    lowerPlans: lowerPlans[role][subscription.plan] || [], pending: downgradeDto(pending),
    previewToken: jwt.sign({ role, accountId, fingerprint: selection }, process.env.JWT_SECRET,
      { algorithm: "HS256", audience: downgradeAudience, subject: String(adminId), expiresIn: "10m" }) };
}

export async function recordSubscriptionDowngrade({ role, accountId, adminId, previewToken, toPlan }) {
  accountId = String(accountId).toLowerCase(); target(role, accountId);
  let selected;
  try { selected = jwt.verify(previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience: downgradeAudience, subject: String(adminId) }); }
  catch { throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "Refresh the downgrade confirmation before continuing."); }
  if (selected.role !== role || selected.accountId !== accountId) throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "The selected account changed. Refresh the confirmation.");
  return serialized(role, accountId, async ({ state, session }) => {
    const subscription = await downgradeEvidence(role, accountId, session);
    const selection = fingerprint(subscription, state);
    if (selection !== selected.fingerprint) throw failure(409, "SUBSCRIPTION_SELECTION_STALE", "The active subscription changed. Refresh the confirmation.");
    if (typeof toPlan !== "string" || !lowerPlans[role][subscription.plan]?.includes(toPlan)) throw failure(400, "SUBSCRIPTION_DOWNGRADE_INVALID", "Select a lower plan for this subscription.");
    const id = downgradeId(role, accountId, selection), previous = await Downgrade.findById(id).session(session).lean();
    if (previous) {
      if (previous.toPlan !== toPlan) throw failure(409, "SUBSCRIPTION_DOWNGRADE_PENDING", "A different downgrade request is already pending for this activation.");
      return { success: true, replayed: true, request: downgradeDto(previous), message: "Downgrade request saved." };
    }
    const [record] = await Downgrade.create([{ _id: id, role, account: accountId, subscription: subscription._id,
      generation: generation(state), activationFingerprint: selection, lastTxRef: subscription.lastTxRef,
      lastTransactionId: subscription.lastTransactionId, fromPlan: subscription.plan, toPlan,
      requestedBy: adminId, requestedAt: new Date(), status: "pending" }], { session });
    return { success: true, replayed: false, request: downgradeDto(record), message: "Downgrade request saved." };
  });
}

// Read only: older activations' requests must not describe a newer subscription.
export async function currentPendingDowngrade({ role, accountId, subscription }) {
  target(role, accountId);
  if (!subscription || subscription.status !== "active") return null;
  const state = await Lifecycle.findById(key(role, accountId)).select("generation").lean();
  const selection = fingerprint(subscription, state);
  const record = await Downgrade.findOne({ _id: downgradeId(role, accountId, selection), status: "pending" })
    .select("fromPlan toPlan status requestedAt").lean();
  return downgradeDto(record);
}
