import { requireNewSubscriptionWithoutBilling } from "./noChargeEligibility.js";
import jwt from "jsonwebtoken";
import process from "node:process";
import { EMPLOYER_PLANS } from "../config/employerPlans.js";
import { TALENT_PLANS } from "../config/talentPlans.js";
import DiscountCode from "../models/DiscountCode.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import TalentSubscription from "../models/TalentSubscription.js";
import { SubscriptionLifecycle } from "../models/SubscriptionLifecycle.js";
import { checkNewEmployerUpgrade, UPGRADE_AUDIENCE, UPGRADE_POLICY } from "../services/employerUpgrade.js";
import { PLAN_REQUEST_ID } from "../utils/employerPlanRequest.js";
import { calculateDiscount } from "../utils/calculateDiscount.js";
import { usdMinorUnits } from "../utils/subscriptionPrice.js";

const catalogs = { talent: TALENT_PLANS, employer: EMPLOYER_PLANS };
const quoteFields = new Set(["code", "plan", "previewToken", "firstEmployerPurchase"]);
const reservationFields = new Set([...quoteFields, "idempotencyKey"]);
export const discountFailure = (status, code, message) => Object.assign(new Error(message), { status, code });

export function checkoutPrice(role, plan) {
  const catalog = Object.hasOwn(catalogs, role) ? catalogs[role] : null;
  const price = catalog && typeof plan === "string" && Object.hasOwn(catalog, plan) ? catalog[plan] : null;
  if (!price) throw discountFailure(400, "DISCOUNT_QUOTE_PLAN_INVALID", "Select a supported paid plan for your account.");
  return catalogPrice(plan, price);
}

function catalogPrice(plan, price) {
  const originalMinor = usdMinorUnits(price.amount);
  if (price.currency !== "USD" || !Number.isSafeInteger(originalMinor) || originalMinor <= 0) {
    throw discountFailure(503, "DISCOUNT_QUOTE_PRICE_UNAVAILABLE", "The price for this plan is unavailable.");
  }
  return { plan, currency: price.currency, originalMinor };
}

// Pure pricing and date check. A quote has no reservation or usage side effects.
export function buildDiscountQuote(discount, { role, plan, price, now = new Date() }) {
  if (!discount) throw discountFailure(404, "DISCOUNT_CODE_INVALID", "Discount code not found.");
  if (discount.active !== true) throw discountFailure(400, "DISCOUNT_CODE_INACTIVE", "This discount code is inactive.");
  const starts = discount.startsAt instanceof Date ? discount.startsAt.getTime() : NaN;
  const expires = discount.expiresAt instanceof Date ? discount.expiresAt.getTime() : NaN;
  if (!Number.isFinite(starts) || !Number.isFinite(expires) || expires <= starts) {
    throw discountFailure(400, "DISCOUNT_CODE_INVALID", "This discount code has an invalid date range.");
  }
  if (now < starts) throw discountFailure(400, "DISCOUNT_CODE_NOT_STARTED", "This discount code is not active yet.");
  if (now >= expires) throw discountFailure(400, "DISCOUNT_CODE_EXPIRED", "This discount code has expired.");
  if (!discount.eligiblePlans?.includes(`${role}:${plan}`)) {
    throw discountFailure(400, "DISCOUNT_CODE_INELIGIBLE", "This discount code does not apply to the selected plan.");
  }
  const { currency, originalMinor: original } = catalogPrice(plan, price);
  if (discount.terms?.type === "fixed" && discount.terms.currency !== currency) {
    throw discountFailure(400, "DISCOUNT_CODE_CURRENCY_MISMATCH", "This discount code does not match the plan currency.");
  }
  let pricing;
  try {
    pricing = calculateDiscount(original, currency, discount.terms);
  } catch {
    throw discountFailure(400, "DISCOUNT_CODE_INVALID", "This discount code has invalid discount terms.");
  }
  return { code: discount._id, plan, currency, ...pricing };
}


export function parseDiscountCheckout(body, role, reservation = false) {
  const fields = reservation ? reservationFields : quoteFields;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(field => !fields.has(field))) {
    throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", reservation
      ? "Send only the code, plan, idempotency key, and Employer upgrade preview token when applicable."
      : "Send only the code, plan, and Employer upgrade preview token when applicable.");
  }
  const raw = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw)) {
    throw discountFailure(400, "DISCOUNT_CODE_INVALID", "Enter a valid discount code.");
  }
  const { plan, previewToken, idempotencyKey, firstEmployerPurchase } = body;
  if (Object.hasOwn(body, "firstEmployerPurchase") && (role !== "employer" || firstEmployerPurchase !== true || previewToken !== undefined)) {
    throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", "Invalid first-time Employer checkout context.");
  }
  const catalog = Object.hasOwn(catalogs, role) ? catalogs[role] : null;
  if (!catalog || typeof plan !== "string" || !Object.hasOwn(catalog, plan)) {
    throw discountFailure(400, "DISCOUNT_QUOTE_PLAN_INVALID", "Select a supported paid plan for your account.");
  }
  if (Object.hasOwn(body, "previewToken") &&
      (role !== "employer" || typeof previewToken !== "string" || !previewToken || previewToken.length > 4096)) {
    throw discountFailure(400, "DISCOUNT_QUOTE_INVALID_REQUEST", "An Employer upgrade requires a valid plan preview token.");
  }
  if (reservation && (typeof idempotencyKey !== "string" || !PLAN_REQUEST_ID.test(idempotencyKey))) {
    throw discountFailure(400, "DISCOUNT_RESERVATION_INVALID_KEY", "Supply a valid UUID v4 idempotency key.");
  }
  return { code: raw.toUpperCase(), plan, previewToken, firstEmployerPurchase, idempotencyKey: idempotencyKey?.toLowerCase() };
}

export async function resolveDiscountCheckout(user, input, session = null) {
  const { role, _id, accountStatus, isVerified } = user;
  const { code, plan, previewToken } = input;
  const price = catalogs[role][plan];
  if (accountStatus !== "active" || isVerified !== true) {
    throw discountFailure(403, "SUBSCRIPTION_CHECKOUT_DENIED", "An active account with confirmed email is required.");
  }
  let upgrade;
  if (previewToken) {
    const accountId = String(_id);
    let selected;
    try {
      selected = jwt.verify(previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience: UPGRADE_AUDIENCE, subject: accountId });
    } catch {
      throw discountFailure(409, "SUBSCRIPTION_SELECTION_STALE", "Refresh your plan before requesting a discount.");
    }
    const state = await SubscriptionLifecycle.findById(`employer:${accountId}`).session(session).lean();
    const { status, activationFingerprint } = await checkNewEmployerUpgrade({ accountId, plan, selected, state, session });
    upgrade = { policy: UPGRADE_POLICY, fromPlan: status.effectivePlan, generation: state?.generation || 0, activationFingerprint };
  } else if (role === "talent") {
    const active = await TalentSubscription.exists({ talent: _id, status: { $in: ["active", "past_due"] } }).session(session);
    if (active) throw discountFailure(409, "SUBSCRIPTION_ALREADY_ACTIVE", "You already have an active subscription.");
  }
  const discount = await DiscountCode.findById(code)
    .select("_id active startsAt expiresAt eligiblePlans terms revision maxTotalUses heldUses successfulUses").session(session).lean();
  const pricing = buildDiscountQuote(discount, { role, plan, price });
  // The authenticated role and server-calculated total determine billing eligibility.
  // The handoff flag only preserves the positive-total restriction on that screen.
  const firstEmployerPurchase = role === "employer" && pricing.payableMinor > 0;
  if (firstEmployerPurchase) {
    await requireNewSubscriptionWithoutBilling({ role, accountId: _id, account: user, session, firstEmployerPurchase: true });
    if (upgrade?.fromPlan === "free") upgrade = undefined;
  } else if (input.firstEmployerPurchase) {
    throw discountFailure(409, "DISCOUNT_FIRST_EMPLOYER_PURCHASE_ZERO", "Use a discount with a positive payable total for this upgrade.");
  }
  if (pricing.payableMinor === 0 && !upgrade) {
    if (role === "employer" && await EmployerSubscription.exists({ employer: _id, status: "active" }).session(session)) {
      throw discountFailure(409, "SUBSCRIPTION_ALREADY_ACTIVE", "You already have an active subscription.");
    }
    await requireNewSubscriptionWithoutBilling({ role, accountId: _id, account: user, session });
  }
  return { discount, pricing, upgrade, firstEmployerPurchase };
}

export function respondDiscountError(res, error, fallback) {
  if (Number.isInteger(error.status) && /^(DISCOUNT_|SUBSCRIPTION_)/.test(error.code)) {
    return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  }
  return res.status(503).json({ success: false, ...fallback });
}
