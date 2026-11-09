import { Link, useLocation } from "react-router-dom";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import TalentPublicProfileAccess from "../subscriptions/TalentPublicProfileAccess";

const TalentPaymentResult = () => {
  const state = useTalentSubscription(true, true);
  const activated = hasTalentPublicAccess(state);
  return <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-lg bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 sm:p-10 text-center">
      <h1 className="text-2xl text-white mb-4">
        {activated ? "Your Public Listing is active" : state.loading || state.checking
          ? "Checking your subscription..." : "Subscription not confirmed"}
      </h1>
      <TalentPublicProfileAccess state={state} />
      {!activated && <>
        <p role={state.error ? "alert" : "status"} className="text-gray-400 mb-6">
          {state.error || "Your subscription is not active yet. Check again before attempting another payment."}
        </p>
        <button type="button" onClick={state.refresh}
          disabled={state.loading || state.checking || state.retryAt > Date.now()}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg">
          {state.retryAt > Date.now() ? "Please wait before checking again" : "Check again"}
        </button>
      </>}
      <Link to="/talent-dashboard/my-plan" className="block mt-5 text-blue-400">View My Plan</Link>
    </div>
  </div>;
};

export const PaymentSuccess = () => {
  const { pathname } = useLocation();
  // A return URL is not payment evidence. Talent confirms through the backend;
  // Employer wording stays neutral and directs users to the existing plan reader.
  if (!pathname.startsWith("/employer/")) return <TalentPaymentResult />;
  return <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
    <div className="max-w-lg rounded-2xl border border-white/10 bg-[#1A1A1E] p-8 text-center text-white">
      <h1 className="text-2xl mb-4">Check your subscription status</h1>
      <p className="text-gray-400">Your payment result must be confirmed by QNDUIT. Check your current plan before attempting another payment.</p>
      <Link to="/dashboard/packages" className="block mt-6 text-blue-400">View My Packages</Link>
    </div>
  </div>;
};

export default PaymentSuccess;
