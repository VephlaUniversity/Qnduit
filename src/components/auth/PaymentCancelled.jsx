
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  XCircle,
  ArrowLeft,
  RotateCcw,
  LayoutDashboard,
} from "lucide-react";

export const PaymentCancelled = () => {
  const location = useLocation();

  const isEmployer = location.pathname.startsWith("/employer/");
  const dashboardPath = isEmployer ? "/dashboard" : "/talent-dashboard";

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 sm:p-10 text-center shadow-xl">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-11 h-11 text-red-400" />
        </div>

        <p className="text-red-400 text-sm font-medium uppercase tracking-wider mb-3">
          Payment Not Completed
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
          No worries. You can try again.
        </h1>

        <p className="text-gray-400 leading-7 mb-8">
          Your payment was cancelled or could not be confirmed. If you believe
          your account was charged, please check your payment status before
          attempting another payment.
        </p>

        <Link
          to="/pricing"
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Try Again
        </Link>

        <Link
          to={dashboardPath}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 mt-3 bg-transparent border border-white/15 hover:bg-white/5 rounded-lg text-white font-medium transition-colors"
        >
          <LayoutDashboard className="w-5 h-5" />
          Return to Dashboard
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default PaymentCancelled;
