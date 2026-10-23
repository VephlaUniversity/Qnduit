import process from "node:process";
import flutterwave from "../utils/flutterwave.js";
import TalentPayment from "../models/TalentPayment.js";
import EmployerPayment from "../models/EmployerPayment.js";
import { activateVerifiedSubscription, recordFailedSubscriptionPayment, applyProviderSubscriptionCancellation, recordUnlinkedSubscriptionCharge } from "../services/subscriptionLifecycle.js";

export const handleFlutterwaveWebhook = async (req, res) => {
  if (!req.headers["verif-hash"] || req.headers["verif-hash"] !== process.env.FLW_SECRET_HASH) {
    return res.status(401).json({ success: false, message: "Invalid webhook signature" });
  }
  try {
    const event = req.body?.event || req.body?.type, data = req.body?.data;
    if (event === "charge.completed" && data?.id) {
      const response = await flutterwave.get(`/transactions/${encodeURIComponent(data.id)}/verify`);
      const transaction = response.data?.data;
      if (!transaction?.tx_ref) return res.json({ received: true });
      // Only a stored explicit checkout establishes ownership. Renewal events
      // without a known reference require reconciliation, never an email match.
      const matches = [];
      for (const [role, Payment] of [["talent", TalentPayment], ["employer", EmployerPayment]]) {
        const payment = await Payment.findOne({ txRef: transaction.tx_ref }).select("_id").lean();
        if (payment) matches.push({ role, paymentId: payment._id });
      }
      if (matches.length !== 1) {
        if (transaction.status === "successful") await recordUnlinkedSubscriptionCharge(transaction);
        return res.json({ received: true, reason: "unlinked_payment_requires_reconciliation" });
      }
      const selection = matches[0];
      if (transaction.status === "successful") {
        const result = await activateVerifiedSubscription({ ...selection, transaction });
        return res.json({ received: true, activated: result.activated, reason: result.reason });
      }
      await recordFailedSubscriptionPayment(selection);
    } else if (event === "subscription.cancelled") {
      // data.id is a provider subscription ID, not proof of a payment link.
      const result = await applyProviderSubscriptionCancellation({ txRef: data?.tx_ref, transactionId: data?.transaction_id });
      return res.json({ received: true, ...result });
    }
    return res.json({ received: true });
  } catch {
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
