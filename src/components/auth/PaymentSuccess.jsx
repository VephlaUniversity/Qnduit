
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  CreditCard,
} from "lucide-react";

import { useTalentSubscription, hasCurrentPublicSubscription } from "../hooks/useTalentSubscription";

const TalentPaymentResult = () => {
  const navigate = useNavigate();
  const { subscription, loading, error, refresh } = useTalentSubscription();
  const activated = subscription?.status === "active" && hasCurrentPublicSubscription(subscription);
  useEffect(() => {
    if (activated) navigate("/talent-dashboard/my-plan", { replace: true });
  }, [activated, navigate]);
  return <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-lg bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 sm:p-10 text-center">
      <h1 className="text-2xl text-white mb-4">{loading ? "Checking your subscription..." : "Subscription not confirmed"}</h1>
      {!loading && <>
        <p className="text-gray-400 mb-6" role={error ? "alert" : undefined}>{error || "Your subscription is not active yet. Check again before attempting another payment."}</p>
        <button type="button" onClick={refresh} className="px-5 py-3 bg-blue-600 text-white rounded-lg">Check again</button>
        <Link to="/talent-dashboard/my-plan" className="block mt-5 text-blue-400">View My Plan</Link>
      </>}
    </div>
  </div>;
};

export const PaymentSuccess = () => {
  const location = useLocation();

  const isEmployer = location.pathname.startsWith("/employer/");
  const dashboardPath = isEmployer ? "/dashboard" : "/talent-dashboard";

  if (!isEmployer) return <TalentPaymentResult />;

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
