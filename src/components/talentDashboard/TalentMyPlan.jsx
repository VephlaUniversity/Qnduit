import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { TalentPlans } from "../TalentPlans";
import SubscriptionDates from "../subscriptions/SubscriptionDates";
import { subscriptionStatusLabel } from "../utils/subscriptionDates";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { useTalentSubscription, hasCurrentPublicSubscription } from "../hooks/useTalentSubscription";
import { planFromUrl } from "../utils/planChoice";
import UserSubscriptionCancellation from "../subscriptions/UserSubscriptionCancellation";

export const TalentMyPlan = () => {
  const [searchParams] = useSearchParams();
  const urlPlan = planFromUrl(`?${searchParams.toString()}`);
  const [selectedPlan, setSelectedPlan] = useState(
    urlPlan === "public" ? "public" : "",
  );
  const { subscription, subscriptionStatus, pendingDowngrade, publicProfile, loading, error: loadError, refresh } = useTalentSubscription();
  const [processing, setProcessing] = useState(false);

  const handlePlanAction = async (planType) => {
    if (planType === "free") {
      toast.info(
        hasCurrentPublicSubscription(subscription)
          ? "Your Public Listing is active. Contact support if you want to cancel it."
          : "You're already on the Free plan.",
      );
      return;
    }

    if (hasCurrentPublicSubscription(subscription)) {
      toast.info("Your Public Listing is already active.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/payments/create-checkout`,
        { plan: planType },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      throw new Error("no checkout link");
    } catch (err) {
      toast.error(
        friendlyError(err, "We couldn't start your payment. Please try again."),
      );
    } finally {
      setProcessing(false);
    }
  };

  const live = hasCurrentPublicSubscription(subscription);
  const displayPublic = subscriptionStatus?.paidEligible === true && subscriptionStatus.effectivePlan === "public";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          My Plan
        </h1>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your plan...</span>
        </div>
      ) : loadError ? (
        <div className="py-12 text-center">
          <p className="text-gray-400 mb-4">{loadError}</p>
          <button
            onClick={() => refresh()}
            className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-4 md:p-6 mb-8">
            <p className="text-gray-400 text-sm mb-1">Current plan</p>
            <p className="text-white text-xl font-semibold">
              {displayPublic ? "Public Listing" : "Free Account"}
            </p>
            <p className="text-gray-400 text-sm mt-2">Status: {subscriptionStatusLabel(subscriptionStatus?.status)}</p>
            <SubscriptionDates subscription={subscription} status={subscriptionStatus} pendingDowngrade={pendingDowngrade} />
            {displayPublic && (
              <UserSubscriptionCancellation
                onCancelled={refresh}
              />
            )}
            {pendingDowngrade && <p role="status" className="mt-3 text-sm text-gray-400">A downgrade to Free is awaiting processing. Current access stays active.</p>}
          </div>

          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-4 md:p-6 mb-8">
            <p className="text-gray-400 text-sm mb-1">Public profile</p>
            <p className="text-white font-semibold">
              {publicProfile?.status === "published" && publicProfile.url ? "Visible" : publicProfile?.status === "unavailable" ? "Unavailable" : "Status could not be loaded"}
            </p>
            {publicProfile?.status === "published" && publicProfile.url && (
              <a href={publicProfile.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 break-all inline-block mt-2">
                {window.location.origin}{publicProfile.url}
              </a>
            )}
          </div>

          <TalentPlans
            selectedPlan={live ? "public" : selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPlanAction={handlePlanAction}
            alwaysActive
            showPayLater={false}
            freeCtaText={live ? "Free Account" : "Your Current Plan"}
            publicCtaText={live ? "Active ✓" : "List My Profile Here →"}
          />
        </>
      )}

      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] text-white px-6 py-4 rounded-lg flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Taking you to payment...
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentMyPlan;
