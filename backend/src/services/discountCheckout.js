import { requireNewSubscriptionWithoutBilling } from "./noChargeEligibility.js";
import process from "node:process";
import { EMPLOYER_PLANS } from "../config/employerPlans.js";
import { TALENT_PLANS } from "../config/talentPlans.js";
import { discountAttemptId } from "./discountReservation.js";
import { DiscountCheckoutAttempt } from "../models/DiscountCheckoutAttempt.js";
import { SubscriptionLifecycle } from "../models/SubscriptionLifecycle.js";
import { usdMinorUnits } from "../utils/subscriptionPrice.js";
import { withSubscriptionLifecycleTransaction } from "./subscriptionLifecycle.js";
import { discountFailure as fail } from "./discountQuote.js";
import { isHostedDiscountCheckoutUrl, readDiscountRecurringPlan, requestDiscountHostedCheckout } from "./discountCheckoutGateway.js";

const catalogs = { talent: TALENT_PLANS, employer: EMPLOYER_PLANS };
const recurringCadence = "monthly";
const missing = () => fail(404, "DISCOUNT_ATTEMPT_NOT_FOUND", "Discount checkout attempt not found.");
const unresolved = () => fail(503, "DISCOUNT_CHECKOUT_UNCONFIRMED", "Checkout initialization could not be confirmed. The reservation remains held.");
const inProgress = () => fail(409, "DISCOUNT_CHECKOUT_INITIALIZING", "Checkout initialization is in progress or unresolved. Check this attempt again.");
const recurringUnverified = () => fail(503, "DISCOUNT_RECURRING_TERMS_UNVERIFIED", "The plan's normal recurring price, currency, and monthly schedule could not be verified.");
const continuationUnavailable = () => fail(409, "DISCOUNT_CHECKOUT_SUPERSEDED", "Your subscription state changed. This checkout link cannot be resumed.");

function requireHeldAttempt(attempt) {
  if (!attempt) throw missing();
  if (attempt.status !== "held") throw fail(409, "DISCOUNT_ATTEMPT_NOT_HELD", "This discount reservation is no longer held.");
}

function requireActiveAccount(account) {
  if (account.accountStatus !== "active" || account.isVerified !== true) {
    throw fail(403, "SUBSCRIPTION_CHECKOUT_DENIED", "An active account with confirmed email is required.");
  }
}

async function verifiedRecurringTerms(attempt) {
  const catalog = catalogs[attempt.role];
  const price = Object.hasOwn(catalog, attempt.plan) ? catalog[attempt.plan] : null;
  const normalMinor = usdMinorUnits(price?.amount);
  const planId = price?.paymentPlanId;
  if (!Number.isSafeInteger(planId) || planId <= 0 || price.currency !== "USD" ||
      price.currency !== attempt.currency || normalMinor !== attempt.originalMinor) throw recurringUnverified();
  let recurring;
  try {
    recurring = await readDiscountRecurringPlan(planId);
  } catch {
    throw recurringUnverified();
  }
  if (recurring?.id !== planId || recurring.status !== "active" || recurring.currency !== price.currency ||
      typeof recurring.interval !== "string" || recurring.interval.toLowerCase() !== recurringCadence ||
      usdMinorUnits(recurring.amount) !== normalMinor) throw recurringUnverified();
  return { paymentPlanId: planId, amountMinor: normalMinor, currency: price.currency, interval: recurringCadence };
}

async function savedCheckout(attempt, lifecycleKey, replayed) {
  const init = attempt.initialization;
  if (init.state === "initializing") throw inProgress();
  if (init.state === "unconfirmed") throw unresolved();
  if (init.state === "rejected") {
    throw fail(422, "DISCOUNT_CHECKOUT_REJECTED", "The provider rejected checkout initialization. The reservation remains held.");
  }
  if (init.state !== "ready" || !isHostedDiscountCheckoutUrl(init.checkoutUrl)) throw unresolved();
  if (init.providerExpiresAt && Date.now() >= init.providerExpiresAt.getTime()) {
    throw fail(409, "DISCOUNT_CHECKOUT_EXPIRED", "The saved checkout link has expired. The reservation remains held.");
  }
  const state = await SubscriptionLifecycle.findById(lifecycleKey).select("pendingPayment").lean();
  if (String(state?.pendingPayment || "") !== String(init.payment)) throw continuationUnavailable();
  return {
    replayed, checkoutAttemptId: attempt._id, initializationState: "ready",
    checkoutUrl: init.checkoutUrl, providerExpiresAt: init.providerExpiresAt ?? null,
    code: attempt.code, codeRevision: attempt.codeRevision, plan: attempt.plan, currency: attempt.currency,
    originalMinor: attempt.originalMinor, discountMinor: attempt.discountMinor, payableMinor: attempt.payableMinor,
  };
}

// Status reads never initialize or replay a provider request.
export async function readDiscountCheckout(user, retryKey) {
  const { role, _id: account } = user;
  requireActiveAccount(user);
  const attempt = await DiscountCheckoutAttempt.findOne({
    _id: discountAttemptId(role, account, retryKey), role, account,
  }).lean();
  if (!attempt) throw missing();
  const { _id, status, code, codeRevision, plan, currency, originalMinor, discountMinor, payableMinor } = attempt;
  const result = { checkoutAttemptId: _id, status, code, codeRevision, plan, currency, originalMinor, discountMinor, payableMinor };
  if (status !== "held") return attempt.noChargeGrant ? {
    ...result, grant: { startsAt: attempt.noChargeGrant.startsAt, endsAt: attempt.noChargeGrant.endsAt },
  } : result;
  const firstEmployerPurchase = role === "employer" && attempt.payableMinor > 0;
  if (!attempt.initialization && attempt.payableMinor !== 0 && !firstEmployerPurchase) return { ...result, initializationState: "not_started" };
  try {
    if (!attempt.initialization) {
      await requireNewSubscriptionWithoutBilling({ role, accountId: account, account: user, firstEmployerPurchase });
      return { ...result, initializationState: "not_started" };
    }
    return { ...await savedCheckout(attempt, `${role}:${account}`, true), status };
  } catch (error) {
    if (!error.code?.startsWith("DISCOUNT_")) throw error;
    return { ...result, initializationState: "unavailable", message: error.message };
  }
}

export async function initializeDiscountCheckout(user, attemptId) {
  const { role, _id: accountId } = user;
  const selection = { _id: attemptId, role, account: accountId };
  const attempt = await DiscountCheckoutAttempt.findOne(selection).lean();
  requireHeldAttempt(attempt);
  requireActiveAccount(user);
  const lifecycleKey = `${role}:${accountId}`;
  if (attempt.initialization) return savedCheckout(attempt, lifecycleKey, true);
  if (attempt.payableMinor === 0) {
    throw fail(400, "DISCOUNT_CHECKOUT_ZERO_PAYABLE", "A zero-payable reservation requires a separate activation flow.");
  }
  if (attempt.currency !== "USD" || !Number.isSafeInteger(attempt.originalMinor) || attempt.originalMinor <= 0 ||
      !Number.isSafeInteger(attempt.payableMinor) || attempt.payableMinor <= 0 || !Number.isSafeInteger(attempt.discountMinor) ||
      attempt.discountMinor < 0 || attempt.payableMinor + attempt.discountMinor !== attempt.originalMinor) {
    throw fail(503, "DISCOUNT_CHECKOUT_PRICING_UNAVAILABLE", "The saved discount checkout pricing is unavailable.");
  }
  if (attempt.upgrade) {
    throw fail(409, "DISCOUNT_UPGRADE_BILLING_UNRESOLVED", "Discounted upgrades require an approved check for existing recurring billing.");
  }
  const observedState = await SubscriptionLifecycle.findById(lifecycleKey).select("generation").lean();
  const recurring = await verifiedRecurringTerms(attempt);

  const claim = await withSubscriptionLifecycleTransaction(role, accountId, async ({ Payment, Subscription, account, state, session }) => {
    const current = await DiscountCheckoutAttempt.findOne(selection).session(session).lean();
    requireHeldAttempt(current);
    requireActiveAccount(account);
    if (current.initialization) return { attempt: current };
    if (role === "employer") {
      await requireNewSubscriptionWithoutBilling({ role, accountId, account, state, session, firstEmployerPurchase: true });
    }
    if ((state.generation || 0) !== (observedState?.generation || 0)) throw continuationUnavailable();
    const active = await Subscription.exists({ [role]: accountId, status: { $in: role === "talent" ? ["active", "past_due"] : ["active"] } }).session(session);
    if (active || (state.pendingPayment && await Payment.exists({ _id: state.pendingPayment, status: "pending" }).session(session))) {
      throw fail(409, "DISCOUNT_CHECKOUT_ALREADY_PENDING_OR_ACTIVE", "This account already has an active subscription or pending checkout.");
    }

    const txRef = `QND-DISCOUNT-${attemptId}`;
    const nextGeneration = (state.generation || 0) + 1;
    const [payment] = await Payment.create([{
      [role]: accountId, txRef, provider: "flutterwave", amount: current.payableMinor / 100,
      currency: current.currency, plan: current.plan, type: "subscription", status: "pending",
      activationGeneration: nextGeneration, metadata: {
        discountCheckoutAttemptId: attemptId, discountCode: current.code, discountCodeRevision: current.codeRevision,
        originalMinor: current.originalMinor, discountMinor: current.discountMinor, payableMinor: current.payableMinor,
        paymentPlanId: recurring.paymentPlanId, recurringTerms: recurring,
      },
    }], { session });

    const initialization = { state: "initializing", payment: payment._id, txRef };
    const claimed = await DiscountCheckoutAttempt.updateOne({
      ...selection, status: "held", "initialization.state": { $exists: false },
    }, { $set: { initialization }, $unset: { releaseCheckAt: 1 } }, { session });
    if (claimed.modifiedCount !== 1) throw inProgress();
    await SubscriptionLifecycle.updateOne({ _id: state._id }, {
      $set: { generation: nextGeneration, pendingPayment: payment._id },
    }, { session });
    return {
      claimed: true, initialization,
      customer: {
        email: account.email,
        name: account.fullName || account.displayName || `${account.firstName || ""} ${account.lastName || ""}`.trim(),
      },
    };
  });

  if (!claim.claimed) return savedCheckout(claim.attempt, lifecycleKey, true);
  const { initialization, customer } = claim;
  const callback = role === "talent" ? "callback" : "employer/payment/callback";
  let reply;
  try {
    reply = await requestDiscountHostedCheckout({
      tx_ref: initialization.txRef, amount: attempt.payableMinor / 100,
      currency: attempt.currency, payment_plan: recurring.paymentPlanId,
      redirect_url: `${process.env.BACKEND_URL}/api/payments/${callback}`,
      customer, customizations: { title: "Qnduit subscription", description: `${attempt.plan} subscription checkout` },
      meta: { checkoutAttemptId: attemptId }, configurations: { session_duration: 10, max_retry_attempt: 5 },
    });
  } catch {
    reply = { state: "unconfirmed" };
  }

  const providerExpiresAt = typeof reply?.providerExpiresAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(reply.providerExpiresAt) ? new Date(reply.providerExpiresAt) : null;
  const validExpiry = reply?.providerExpiresAt == null || (providerExpiresAt && Number.isFinite(providerExpiresAt.getTime()));
  const ready = reply?.state === "ready" && isHostedDiscountCheckoutUrl(reply.checkoutUrl) && validExpiry;
  const outcome = ready ? { state: "ready", checkoutUrl: reply.checkoutUrl, ...(providerExpiresAt ? { providerExpiresAt } : {}) }
    : { state: reply?.state === "rejected" ? "rejected" : "unconfirmed" };
  // An ambiguous database write leaves the claim intact. The server never sends
  // a second provider POST for the same reservation.
  const savedFields = { initialization: { ...initialization, ...outcome } };
  if (outcome.state !== "unconfirmed") {
    savedFields.releaseCheckAt = providerExpiresAt || new Date(Date.now() + 30 * 60_000);
  }
  const saved = await DiscountCheckoutAttempt.findOneAndUpdate({
    ...selection, status: "held", "initialization.state": "initializing", "initialization.txRef": initialization.txRef,
  }, { $set: savedFields }, { new: true }).lean();
  if (!saved) throw unresolved();
  return savedCheckout(saved, lifecycleKey, false);
}
