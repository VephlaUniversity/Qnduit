import TalentSubscription from "../models/TalentSubscription.js";
import EmployerSubscription from "../models/EmployerSubscription.js";
import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";
import { SubscriptionLifecycle } from "../models/SubscriptionLifecycle.js";

const models = {
  talent: [TalentSubscription, TalentPayment],
  employer: [EmployerSubscription, EmployerPayment],
};

export async function requireNewSubscriptionWithoutBilling({ role, accountId, account, state, session = null, firstEmployerPurchase = false }) {
  const [Subscription, Payment] = models[role];
  const lifecycle = state ?? await SubscriptionLifecycle.findById(`${role}:${accountId}`)
    .select("activePayment pendingPayment").session(session).lean();
  const historicalMarker = firstEmployerPurchase && (account?.paystackReference || account?.planExpiresAt ||
    (account?.paymentStatus != null && account.paymentStatus !== "none"));
  if (historicalMarker || lifecycle?.pendingPayment || lifecycle?.activePayment || ["pending", "active"].includes(account?.paymentStatus) ||
      await Subscription.exists({ [role]: accountId }).session(session) ||
      await Payment.exists({ [role]: accountId }).session(session)) {
    throw Object.assign(new Error(firstEmployerPurchase ? "Discounted checkout here is available only for new subscriptions without prior or pending billing." : "No-charge activation is available only for new subscriptions without prior or pending billing."),
      { status: 409, code: firstEmployerPurchase ? "DISCOUNT_FIRST_EMPLOYER_PURCHASE_UNAVAILABLE" : "DISCOUNT_NO_CHARGE_ENROLLMENT" });
  }
}
