import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "sonner";
import { TalentPlans } from "../TalentPlans";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { planFromUrl } from "../utils/planChoice";

const STATUS_LABELS = {
  active: "Active",
  past_due: "Payment overdue",
  pending: "Awaiting payment",
  canceled: "Cancelled",
};

const isLive = (subscription) =>
  Boolean(subscription) && ["active", "past_due"].includes(subscription.status);

export const TalentMyPlan = () => {
  const [searchParams] = useSearchParams();
  const urlPlan = planFromUrl(`?${searchParams.toString()}`);
  const [selectedPlan, setSelectedPlan] = useState(
    urlPlan === "public" ? "public" : "",
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [processing, setProcessing] = useState(false);

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

  const handlePlanAction = async (planType) => {
    if (planType === "free") {
      toast.info(
        isLive(subscription)
          ? "Your Public Listing is active. Contact support if you want to cancel it."
          : "You're already on the Free plan.",
      );
      return;
    }

    if (isLive(subscription)) {
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

  const live = isLive(subscription);

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
            onClick={() => setReloadKey((k) => k + 1)}
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
