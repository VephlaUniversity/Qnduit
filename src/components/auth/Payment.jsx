import { useState, useEffect } from "react";
import { ChevronLeft, Check, X } from "lucide-react";

export const Payment = () => {
  const [currentPage, setCurrentPage] = useState("authorization");
  const [countdown, setCountdown] = useState(5);

  // Get plan data from URL params or state
  const params = new URLSearchParams(window.location.search);
  const planName = params.get("planName") || "Silver";
  const price = parseFloat(params.get("price") || "8.99");
  const userType = params.get("userType") || "employer";
  const email = params.get("email") || "";

  // Stripe Authorization countdown
  useEffect(() => {
    if (currentPage === "authorization" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (currentPage === "authorization" && countdown === 0) {
      // Simulate random success/failure
      const isSuccess = Math.random() > 0.3;
      setCurrentPage(isSuccess ? "success" : "failure");
    }
  }, [countdown, currentPage]);

  const subtotal = price;
  const tax = parseFloat((subtotal * 0.0975).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const handlePayment = () => {
    setCurrentPage("authorization");
    setCountdown(5);
  };

  const handleRetry = () => {
    setCurrentPage("checkout");
  };

  const handleProceedDashboard = () => {
    alert("Proceeding to Dashboard...");
  };

  // Stripe Authorization Page
  if (currentPage === "authorization") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        <button
          onClick={() => setCurrentPage("checkout")}
          className="absolute top-8 left-8 flex items-center gap-2 text-white hover:text-gray-300 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous Page
        </button>

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-8">
          <span className="text-white text-2xl font-bold">S</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          Stripe Authorization
        </h1>
        <p className="text-gray-400 text-center max-w-md mb-4">
          You are being redirected to your bank to protect your card against
          unauthorized use.
        </p>

        <p className="text-yellow-400 font-semibold text-lg">
          Redirection in {countdown.toString().padStart(2, "0")}
        </p>
      </div>
    );
  }

  // Checkout Page
  if (currentPage === "checkout") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white mb-8 hover:text-gray-300 transition"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous Page
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden">
            {/* Order Summary */}
            <div className="bg-gray-50 p-8">
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
            </div>

            {/* Payment Form */}
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    defaultValue={email}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Information
                  </label>
                  <input
                    type="text"
                    placeholder="1234 1234 1234 1234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM / YY"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder name
                  </label>
                  <input
                    type="text"
                    placeholder="Full name on card"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country or region
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP
                  </label>
                  <input
                    type="text"
                    placeholder="12345"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handlePayment}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition mt-8"
                >
                  Pay ${total.toFixed(2)}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Powered by <span className="font-semibold">stripe</span>
                </p>
                <div className="flex gap-4 justify-center text-xs text-gray-500">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Page
  if (currentPage === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8">
          <Check className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-4xl font-bold text-green-400 mb-2 text-center">
          Payment Confirmed
        </h1>
        <h2 className="text-3xl font-bold text-green-400 mb-6 text-center">
          Welcome Aboard!
        </h2>

        <p className="text-gray-300 text-center max-w-md mb-2">
          Your subscription is confirmed and your account is all set to begin.
        </p>
        <p className="text-gray-400 text-center max-w-md mb-8 text-sm">
          Plan: <span className="text-white font-semibold">{planName}</span> - $
          {total.toFixed(2)}/month
        </p>

        <button
          onClick={handleProceedDashboard}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          Proceed to Dashboard
        </button>
      </div>
    );
  }

  // Failure Page
  if (currentPage === "failure") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-8">
          <X className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-4xl font-bold text-red-500 mb-2 text-center">
          Payment Subscription
        </h1>
        <h2 className="text-3xl font-bold text-red-500 mb-6 text-center">
          Unsuccessful
        </h2>

        <p className="text-gray-300 text-center max-w-md mb-8">
          Your subscription payment was unsuccessful, and your account access is
          paused
        </p>

        <button
          onClick={handleRetry}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          Retry Payment
        </button>
      </div>
    );
  }
};
