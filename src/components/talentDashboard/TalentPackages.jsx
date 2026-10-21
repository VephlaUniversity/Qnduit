import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  useTalentSubscription,
  hasCurrentPublicSubscription,
} from "../hooks/useTalentSubscription";
import { TalentPlans } from "../TalentPlans";

const STATUS_LABELS = {
  active: "Active",
  past_due: "Payment overdue",
  pending: "Awaiting payment",
  canceled: "Cancelled",
};

const TalentPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  const { subscription, loading, error, refresh } = useTalentSubscription();
  const currentPlan = hasCurrentPublicSubscription(subscription);

  const handlePlanAction = (planType, actionType) => {
    if (actionType === "payLater") {
      navigate("/talent-dashboard");
      return;
    }
    if (!planType) {
      toast.error("Please select a plan first.");
      return;
    }

    if (planType === "free") {
      toast.info(
        currentPlan
          ? "Your Public Listing is active. Contact support if you want to cancel it."
          : "You're already on the Free plan.",
      );
      return;
    }

    if (loading || error) return;

    // Already subscribed: don't send them to pay a second time.
    if (currentPlan) {
      navigate("/talent-dashboard/my-plan");
      return;
    }

    if (actionType === "payNow") {
      navigate(`/payment?plan=${encodeURIComponent(planType)}&userType=talent`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 text-white">
      <h1 className="text-2xl font-bold mb-2">My Packages</h1>
      <p className="text-gray-400 mb-8">
        Choose a package to improve your visibility on QNDUIT.
      </p>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your plan...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center" role="alert">
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-4 md:p-6 mb-8">
            <p className="text-gray-400 text-sm mb-1">Your current plan</p>
            <p className="text-white text-xl font-semibold">
              {currentPlan ? "Public Listing" : "Free Account"}
            </p>
            {subscription && (
              <p className="text-gray-400 text-sm mt-2">
                Status:{" "}
                {STATUS_LABELS[subscription.status] || subscription.status}
                {currentPlan && subscription.currentPeriodEnd
                  ? ` · Renews or ends ${dayjs(subscription.currentPeriodEnd).format("MMMM D, YYYY")}`
                  : ""}
              </p>
            )}
          </div>

          <TalentPlans
            selectedPlan={currentPlan ? "public" : selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPlanAction={handlePlanAction}
            alwaysActive={currentPlan}
            freeCtaText={currentPlan ? "Free Account" : "Your Current Plan"}
            publicCtaText={currentPlan ? "View My Plan" : "Subscribe Now →"}
          />
        </>
      )}
    </div>
  );
};

export default TalentPackages;
