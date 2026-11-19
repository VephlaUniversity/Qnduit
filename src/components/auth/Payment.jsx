import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion as Motion } from "framer-motion";
import axios from "axios";

import { API_BASE_URL } from "../utils/api";
import { useTalentSubscription, talentPaymentToken } from "../hooks/useTalentSubscription";
import { usePlanAction } from "../hooks/usePlanAction";
import { formatCheckoutUsd, useCheckoutDiscount } from "../hooks/useCheckoutDiscount";
import { useDiscountPayment } from "../hooks/useDiscountPayment";
import CheckoutDiscount from "../subscriptions/CheckoutDiscount";

const paymentToken = userType => userType === "talent"
  ? talentPaymentToken() : localStorage.getItem("token");

export const Payment = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = searchParams.get("plan") || "";
  const userType = searchParams.get("userType") || "employer";
  const validPlan = userType === "talent" ? plan === "public"
    : userType === "employer" && ["bronze", "silver", "platinum"].includes(plan);
  const planName = validPlan ? plan[0].toUpperCase() + plan.slice(1) : "";

  const navigate = useNavigate();
  const subscriptionState = useTalentSubscription(userType === "talent");
  const currentPlan = hasTalentPublicAccess(subscriptionState);
  const { state: handoff } = useLocation();
  const firstEmployerPurchase = userType === "employer" && handoff?.firstEmployerPurchase === true && handoff.plan === plan;
  const discount = useCheckoutDiscount({ role: userType, plan, enabled: validPlan && !currentPlan,
    firstEmployerPurchase, initialCode: firstEmployerPurchase ? handoff.code : undefined });
  const blockedHandoff = firstEmployerPurchase && Boolean(discount.code) && !discount.quote;
  const fullPrice = discount.price.amount;
  const payment = useDiscountPayment(discount.owner, plan, firstEmployerPurchase);
  const anotherPlan = payment.entry && payment.entry.plan !== plan;
  const zero = discount.quote?.payableMinor === 0;
  const confirm = payment.phase === "confirm" && payment.attempt?.payableMinor >= 0;
  const grant = payment.attempt?.grant;
  const noCharge = zero || payment.attempt?.payableMinor === 0;
  const periodDate = value => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
  const redeemed = payment.phase === "redeemed";
  const blockedByTalentSubscription = userType === "talent" && (currentPlan || subscriptionState.loading || subscriptionState.error);
  const checkoutLabel = payment.busy ? "Checking checkout…"
    : payment.phase === "ready" ? "Resume checkout"
      : confirm ? payment.attempt.payableMinor === 0 ? "Confirm no-charge activation"
        : `Confirm and continue — ${formatCheckoutUsd(payment.attempt.payableMinor)}`
        : payment.phase === "retry_reserve" ? "Retry same reservation" : "Check checkout status";

  const validate = () => {
    if (!validPlan) {
      return "Please select a valid subscription plan.";
    }

    if (!discount.available) {
      return `Sign in with your ${userType === "talent" ? "Talent" : "Employer"} account to continue.`;
    }

    return "";
  };

  const handlePayment = async () => {
    if (userType === "talent") {
      if (subscriptionState.loading || subscriptionState.error) return;
      if (currentPlan) {
        navigate("/talent-dashboard/my-plan");
        return;
      }
    }
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (payment.blocksPayment() || blockedHandoff) return;
    if (discount.quote) {
      await payment.start(discount.quote);
      return;
    }
    if (!discount.canPay()) return;
    setError("");
    setLoading(true);

    try {
      const endpoint =
        userType === "talent"
          ? "/api/payments/create-checkout"
          : "/api/payments/employer/create-checkout";

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        { plan },
        {
          headers: {
            Authorization: `Bearer ${paymentToken(userType)}`,
          },
        }
      );

      if (!response.data?.success || !response.data?.checkoutUrl) {
        throw new Error(
          response.data?.message || "Unable to create payment checkout."
        );
      }

      window.location.assign(response.data.checkoutUrl);
    } catch (err) {
      console.error("Payment checkout error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start payment. Please try again."
      );

      setLoading(false);
    }
  };

  const { pending, submit } = usePlanAction(handlePayment);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Motion.button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-white mb-8 hover:text-gray-300 transition"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous Page
        </Motion.button>

        <Motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          {/* Order Summary */}
          <Motion.div
            className="bg-gray-50 p-8"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Order Summary
            </h2>

            <div className="space-y-4 pb-8 border-b border-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-700">Subscription</span>
                <span className="text-gray-900 font-semibold">
                  {planName || "Invalid plan"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">Billing</span>
                <span className="text-gray-900 font-semibold">{noCharge ? "One month" : "Monthly"}</span>
              </div>
            </div>

            <div className="mt-8 text-gray-900">
              <CheckoutDiscount discount={discount} disabled={loading || pending} payment={{ ...payment, plan }} />
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{planName || "No plan selected"}</span>
                {" "} - Monthly subscription
              </p>

              <p className="text-xs text-gray-500 mt-2">
                Account Type:{" "}
                <span className="capitalize">{userType}</span>
              </p>
            </div>
          </Motion.div>

          {/* Payment Details */}
          <Motion.div
            className="p-8 flex flex-col justify-center"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Secure Checkout
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              {noCharge
                ? "This discount covers one subscription period. No payment or recurring billing is required."
                : "Continue to Flutterwave to complete your payment securely. Your account details will be retrieved by our backend."}
            </p>

            {userType === "talent" && subscriptionState.error && <p role="alert" className="text-red-600 mb-4">{subscriptionState.error} <button type="button" onClick={subscriptionState.refresh}>Try again</button></p>}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {error}
              </div>
            )}

            {payment.message && <p role="status" className="mb-3 text-sm text-gray-800">{payment.message}</p>}
            {payment.locked && !redeemed && <p role="status" className="mb-3 text-sm text-gray-800">
              {anotherPlan ? "You have a saved discounted checkout for another plan."
                : confirm ? "Review the saved total above and confirm before continuing."
                  : payment.phase === "ready" ? "Your saved checkout link is ready to resume."
                      : "Use this saved attempt to check or resume checkout. A new payment won’t start automatically."}
            </p>}
            {payment.locked && (anotherPlan && !redeemed ? <Link
              className="font-semibold text-blue-700 underline"
              to={`/payment?userType=${encodeURIComponent(userType)}&plan=${encodeURIComponent(payment.entry.plan)}`}>
              Open saved checkout
            </Link> : redeemed ? <div className="space-y-2 text-sm">
              <p role="status">{grant ? "No-charge subscription activated." : "Payment confirmed."}</p>
              {grant && <p>{periodDate(grant.startsAt)} – {periodDate(grant.endsAt)} (UTC). No recurring billing.</p>}
              <Link className="font-semibold text-blue-700 underline" to={userType === "talent" ? "/talent-dashboard/my-plan" : "/dashboard/packages"}>View My Plan</Link>
              <button type="button" onClick={payment.dismissConfirmed} disabled={payment.busy} className="ml-4 underline">Close saved checkout</button>
            </div> : <Motion.button type="button"
              disabled={payment.busy || ((confirm || payment.phase === "ready") && Boolean(blockedByTalentSubscription))}
              onClick={payment.phase === "ready" ? payment.resume : payment.action}
              className="min-h-11 w-full rounded-lg bg-gray-900 px-3 font-semibold text-white disabled:opacity-60">
              {checkoutLabel}
            </Motion.button>)}
            {!payment.locked && <Motion.button
              type="button"
              onClick={() => submit(plan, "payNow")}
              disabled={loading || pending || payment.busy || discount.pending || blockedHandoff ||
                (discount.available && discount.price.status !== "ready") || (userType === "talent" && subscriptionState.loading)}
              aria-busy={loading || pending || payment.busy}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {userType === "talent" && currentPlan ? "View My Plan" : loading ? "Connecting to Flutterwave..."
                : zero ? "Activate subscription — $0.00"
                  : discount.quote ? `Continue to Payment — ${formatCheckoutUsd(discount.quote.payableMinor)}`
                    : !validPlan ? "Select a Valid Plan"
                      : fullPrice == null ? "Continue to Payment" : `Continue to Payment — ${formatCheckoutUsd(fullPrice)}`}
            </Motion.button>}

            <p className="text-xs text-gray-500 text-center mt-6">
              Secure payment powered by{" "}
              <span className="font-semibold">Flutterwave</span>
            </p>
          </Motion.div>
        </Motion.div>
      </div>
    </div>
  );
};

export default Payment;
