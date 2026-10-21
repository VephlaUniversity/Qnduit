import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "sonner";
import { TalentPlans } from "../TalentPlans";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";

const STATUS_LABELS = {
  active: "Active",
  past_due: "Payment overdue",
  pending: "Awaiting payment",
  canceled: "Cancelled",
};

const isLive = (subscription) =>
  Boolean(subscription) && ["active", "past_due"].includes(subscription.status);

const TalentPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/payments/subscription`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!cancelled) setSubscription(res.data?.subscription || null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            friendlyError(err, "We couldn't load your plan. Please try again."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const live = isLive(subscription);

  const handlePlanAction = (planType, actionType) => {
    if (!planType) {
      toast.error("Please select a plan first.");
      return;
    }

    if (planType === "free") {
      toast.info(
        live
          ? "Your Public Listing is active. Contact support if you want to cancel it."
          : "You're already on the Free plan.",
      );
      return;
    }

    // Already subscribed: don't send them to pay a second time.
    if (live) {
      toast.info("Your Public Listing is already active.");
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
      ) : loadError ? (
        <div className="py-12 text-center">
          <p className="text-gray-400 mb-4">{loadError}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
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
              {live ? "Public Listing" : "Free Account"}
            </p>
            {subscription && (
              <p className="text-gray-400 text-sm mt-2">
                Status:{" "}
                {STATUS_LABELS[subscription.status] || subscription.status}
                {live && subscription.currentPeriodEnd
                  ? ` · Renews or ends ${dayjs(subscription.currentPeriodEnd).format("MMMM D, YYYY")}`
                  : ""}
              </p>
            )}
          </div>

          <TalentPlans
            selectedPlan={live ? "public" : selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPlanAction={handlePlanAction}
            alwaysActive
            showPayLater={false}
            freeCtaText={live ? "Free Account" : "Your Current Plan"}
            publicCtaText={live ? "Active ✓" : "Subscribe Now →"}
          />
        </>
      )}
    </div>
  );
};

export default TalentPackages;
