import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export const Payment = () => {
  const [currentPage, setCurrentPage] = useState("checkout");
  const [countdown, setCountdown] = useState(5);

  const { planName, price, userType, email } = useMemo(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    return {
      planName: params.get("planName") || "Silver",
      price: parseFloat(params.get("price") || "8.99"),
      userType: params.get("userType") || "employer",
      email: params.get("email") || "",
    };
  }, []);

  const { subtotal, tax, total } = useMemo(() => {
    const subtotal = price;
    const tax = parseFloat((subtotal * 0.0975).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [price]);

  const [form, setForm] = useState({
    email: email,
    cardNumber: "",
    expiry: "",
    cvc: "",
    cardName: "",
    country: "United States",
    zip: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currentPage !== "authorization") return;
    if (countdown <= 0) {
      const isSuccess = Math.random() > 0.3;
      setCurrentPage(isSuccess ? "success" : "failure");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, currentPage]);

  const validate = () => {
    const newErrors = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Valid email is required.";
    if (!form.cardNumber || form.cardNumber.replace(/\s/g, "").length < 16)
      newErrors.cardNumber = "Enter a valid 16-digit card number.";
    if (!form.expiry || !/^\d{2}\/\d{2}$/.test(form.expiry))
      newErrors.expiry = "Use MM/YY format.";
    if (!form.cvc || !/^\d{3,4}$/.test(form.cvc))
      newErrors.cvc = "Enter a valid CVC.";
    if (!form.cardName.trim())
      newErrors.cardName = "Cardholder name is required.";
    if (!form.zip || !/^\d{5}(-\d{4})?$/.test(form.zip))
      newErrors.zip = "Enter a valid ZIP code.";
    return newErrors;
  };

  const handlePayment = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setCountdown(5);
    setCurrentPage("authorization");
  };

  const handleRetry = () => {
    setCountdown(5);
    setCurrentPage("checkout");
  };

  const handleProceedDashboard = () => {
    window.location.href = "/dashboard";
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setForm((prev) => ({ ...prev, cardNumber: formatted }));
    if (errors.cardNumber)
      setErrors((prev) => ({ ...prev, cardNumber: undefined }));
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) raw = raw.slice(0, 2) + "/" + raw.slice(2);
    setForm((prev) => ({ ...prev, expiry: raw }));
    if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: undefined }));
  };

  // ─── Authorization Page ────────────────────────────────────────────────────
  if (currentPage === "authorization") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        {/* Back Button */}
        <motion.button
          onClick={() => {
            setCountdown(5);
            setCurrentPage("checkout");
          }}
          className="absolute top-8 left-8 flex items-center gap-2 text-white hover:text-gray-300 transition"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous Page
        </motion.button>

        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5B5FED] to-[#5865F2] flex items-center justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="text-white text-2xl font-bold">S</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-4xl font-bold text-white mb-4 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          Stripe Authorization
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="text-gray-400 text-center max-w-md mb-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        >
          You are being redirected to your bank to protect your card against
          unauthorized use.
        </motion.p>

        {/* Countdown */}
        <motion.p
          className="text-yellow-400 font-semibold text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          Redirection in {countdown.toString().padStart(2, "0")}
        </motion.p>
      </div>
    );
  }

  // ─── Checkout Page ─────────────────────────────────────────────────────────
  if (currentPage === "checkout") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Back Button */}
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
                  <span className="text-gray-700">Subtotal</span>
                  <span className="text-gray-900 font-semibold">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax (9.75%)</span>
                  <span className="text-gray-900 font-semibold">
                    ${tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Shipping</span>
                  <span className="text-gray-900 font-semibold">Free</span>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{planName}</span> - Monthly
                  subscription
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Account Type: <span className="capitalize">{userType}</span>
                </p>
              </div>
            </motion.div>

            {/* Payment Form */}
            <motion.div
              className="p-8"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            >
              <div className="space-y-6">
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange("email")}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </motion.div>

                {/* Card Information */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Information
                  </label>
                  <input
                    type="text"
                    placeholder="1234 1234 1234 1234"
                    value={form.cardNumber}
                    onChange={handleCardNumberChange}
                    inputMode="numeric"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 ${
                      errors.cardNumber ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-xs mb-2">
                      {errors.cardNumber}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={form.expiry}
                        onChange={handleExpiryChange}
                        inputMode="numeric"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.expiry ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                      {errors.expiry && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.expiry}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CVC"
                        value={form.cvc}
                        onChange={handleChange("cvc")}
                        inputMode="numeric"
                        maxLength={4}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.cvc ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                      {errors.cvc && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.cvc}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Cardholder Name */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder name
                  </label>
                  <input
                    type="text"
                    placeholder="Full name on card"
                    value={form.cardName}
                    onChange={handleChange("cardName")}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.cardName ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.cardName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.cardName}
                    </p>
                  )}
                </motion.div>

                {/* Country */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.45 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country or region
                  </label>
                  <select
                    value={form.country}
                    onChange={handleChange("country")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>United States</option>
                    <option>Nigeria</option>
                    <option>United Kingdom</option>
                  </select>
                </motion.div>

                {/* ZIP */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP
                  </label>
                  <input
                    type="text"
                    placeholder="12345"
                    value={form.zip}
                    onChange={handleChange("zip")}
                    inputMode="numeric"
                    maxLength={10}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.zip ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {errors.zip && (
                    <p className="text-red-500 text-xs mt-1">{errors.zip}</p>
                  )}
                </motion.div>

                {/* Pay Button */}
                <motion.button
                  onClick={handlePayment}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition mt-8"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.55 }}
                >
                  Pay ${total.toFixed(2)}
                </motion.button>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
                >
                  <p className="text-xs text-gray-500 text-center">
                    Powered by <span className="font-semibold">stripe</span>
                  </p>
                  <div className="flex gap-4 justify-center text-xs text-gray-500 mt-2">
                    <a href="#" className="hover:text-gray-700">
                      Legal
                    </a>
                    <a href="#" className="hover:text-gray-700">
                      Returns
                    </a>
                    <a href="#" className="hover:text-gray-700">
                      Contact
                    </a>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Success Page ──────────────────────────────────────────────────────────
  if (currentPage === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        {/* Icon */}
        <motion.div
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Check className="w-10 h-10 text-green-500" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-4xl font-bold text-green-400 mb-2 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          Payment Confirmed
        </motion.h1>

        <motion.h2
          className="text-3xl font-bold text-green-400 mb-6 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        >
          Welcome Aboard!
        </motion.h2>

        {/* Subtext */}
        <motion.p
          className="text-gray-300 text-center max-w-md mb-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          Your subscription is confirmed and your account is all set to begin.
        </motion.p>

        <motion.p
          className="text-gray-400 text-center max-w-md mb-8 text-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
        >
          Plan: <span className="text-white font-semibold">{planName}</span> - $
          {total.toFixed(2)}/month
        </motion.p>

        {/* CTA Button */}
        <motion.button
          onClick={handleProceedDashboard}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
          Proceed to Dashboard
        </motion.button>
      </div>
    );
  }

  // ─── Failure Page ──────────────────────────────────────────────────────────
  if (currentPage === "failure") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        {/* Icon */}
        <motion.div
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <X className="w-10 h-10 text-red-500" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-4xl font-bold text-red-500 mb-2 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          Payment Subscription
        </motion.h1>

        <motion.h2
          className="text-3xl font-bold text-red-500 mb-6 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        >
          Unsuccessful
        </motion.h2>

        {/* Subtext */}
        <motion.p
          className="text-gray-300 text-center max-w-md mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          Your subscription payment was unsuccessful, and your account access is
          paused.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          onClick={handleRetry}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
        >
          Retry Payment
        </motion.button>
      </div>
    );
  }
};
export default Payment;
