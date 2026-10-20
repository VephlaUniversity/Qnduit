import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

import { API_BASE_URL } from "../utils/api";
import { usePlanAction } from "../hooks/usePlanAction";

const paymentToken = userType => userType === "talent"
  ? localStorage.getItem("authToken") || localStorage.getItem("token")
  : localStorage.getItem("token");

export const Payment = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { plan, planName, price, userType } = useMemo(() => {
    const params = searchParams;

    const selectedPlan = params.get("plan") || "";
    const selectedUserType = params.get("userType") || "employer";

    const plans = {
      public: { name: "Public", price: 1.99 },
      bronze: { name: "Bronze", price: 6.99 },
      silver: { name: "Silver", price: 8.99 },
      platinum: { name: "Platinum", price: 12.99 },
    };

    const selected = plans[selectedPlan];

    return {
      plan: selectedPlan,
      planName: selected?.name || "",
      price: selected?.price ?? null,
      userType: selectedUserType,
    };
  }, [searchParams]);

  const validate = () => {
    if (!plan || price === null) {
      return "Please select a valid subscription plan.";
    }

    if (
      (userType !== "talent" && userType !== "employer") ||
      (userType === "talent" && plan !== "public") ||
      (userType === "employer" &&
        !["bronze", "silver", "platinum"].includes(plan))
    ) {
      return "The selected plan is invalid for this account type.";
    }

    if (!paymentToken(userType)) {
      return "Your session has expired. Please log in again.";
    }

    return "";
  };

  const handlePayment = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

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
        <motion.button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-white mb-8 hover:text-gray-300 transition"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous Page
        </motion.button>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          {/* Order Summary */}
          <motion.div
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
                <span className="text-gray-900 font-semibold">Monthly</span>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                {price === null ? "—" : `$${price.toFixed(2)}`}
              </span>
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
          </motion.div>

          {/* Payment Details */}
          <motion.div
            className="p-8 flex flex-col justify-center"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Secure Checkout
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              Continue to Flutterwave to complete your payment securely.
              Your account details will be retrieved by our backend.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {error}
              </div>
            )}

            <motion.button
              type="button"
              onClick={() => submit(plan, "payNow")}
              disabled={loading || pending}
              aria-busy={loading || pending}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading
                ? "Connecting to Flutterwave..."
                : price === null
                  ? "Select a Valid Plan"
                  : `Continue to Payment — $${price.toFixed(2)}`}
            </motion.button>

            <p className="text-xs text-gray-500 text-center mt-6">
              Secure payment powered by{" "}
              <span className="font-semibold">Flutterwave</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;