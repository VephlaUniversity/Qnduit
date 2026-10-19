
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  CreditCard,
} from "lucide-react";

export const PaymentSuccess = () => {
  const location = useLocation();

  const isEmployer = location.pathname.startsWith("/employer/");
  const dashboardPath = isEmployer ? "/dashboard" : "/talent-dashboard";

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 sm:p-10 text-center shadow-xl">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-11 h-11 text-green-400" />
        </div>

        <p className="text-green-400 text-sm font-medium uppercase tracking-wider mb-3">
          Payment Successful
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
          You're all set!
        </h1>

        <p className="text-gray-400 leading-7 mb-8">
          Your payment has been verified successfully. Your selected plan is
          ready, and you can continue using QNDUIT.
        </p>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
          <CreditCard className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-white text-sm font-medium">
              Subscription confirmed
            </p>
            <p className="text-gray-400 text-sm mt-1">
              You can check your plan and subscription details from your
              dashboard.
            </p>
          </div>
        </div>

        <Link
          to={dashboardPath}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          <LayoutDashboard className="w-5 h-5" />
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to="/pricing"
          className="inline-block mt-5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
