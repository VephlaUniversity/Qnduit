import TalentPublicProfileAccess from "../subscriptions/TalentPublicProfileAccess";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { browserSessions } from "../utils/requestSafety";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { TalentPlans } from "../TalentPlans";
import SubscriptionDates from "../subscriptions/SubscriptionDates";
import { subscriptionStatusLabel } from "../utils/subscriptionDates";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { planFromUrl } from "../utils/planChoice";
import UserSubscriptionCancellation from "../subscriptions/UserSubscriptionCancellation";

export const TalentMyPlan = () => {
  const [searchParams] = useSearchParams();
  const urlPlan = planFromUrl(`?${searchParams.toString()}`);
  const [selectedPlan, setSelectedPlan] = useState(
    urlPlan === "public" ? "public" : "",
  );
  const entitlement = useTalentSubscription();
  const {
    subscription, subscriptionStatus, pendingDowngrade, publicPortfolio,
    loading, error: loadError, refresh,
  } = entitlement;
  const [processing, setProcessing] = useState(false);

  const { user } = useAuth();
  const actor = user?.userType === "talent" ? `talent:${user.id || user._id}` : null;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const setupRequest = useRef(null);
  const [settingUp, setSettingUp] = useState(false);
  useEffect(() => () => setupRequest.current?.abort(), [actor, token]);

  const handlePortfolioSetup = async () => {
    if (
      setupRequest.current || loading || loadError ||
      publicPortfolio?.reason !== "username_missing"
    ) return;
    if (!token) {
      toast.error("Please sign in again to set up your portfolio.");
      return;
    }
    const controller = new AbortController();
    setupRequest.current = controller;
    setSettingUp(true);
    const current = () => !controller.signal.aborted &&
      browserSessions().some(owner => owner.actor === actor && owner.token === token);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/talents/portfolio-username`,
        {},
        {
          signal: controller.signal,
          timeout: 15000,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!current()) return;
      if (
        data?.success !== true || typeof data.username !== "string" || !data.username.trim()
      ) throw new Error("Setup was not confirmed");
      refresh();
      toast.success("Your portfolio username is ready. Refreshing availability.");
    } catch (error) {
      if (!current()) return;
      const code = error.response?.data?.code;
      toast.error(
        ["PORTFOLIO_USERNAME_INDEX_UNAVAILABLE", "PORTFOLIO_USERNAME_INDEX_REQUIRED"].includes(code)
          ? "Portfolio setup is temporarily unavailable. Please try again later or contact support."
          : friendlyError(
            error,
            "Portfolio setup could not be confirmed. Please try again; any assigned username will be preserved.",
          ),
      );
    } finally {
      if (setupRequest.current === controller) {
        setupRequest.current = null;
        setSettingUp(false);
      }
    }
  };

  const handlePlanAction = async (planType) => {
    if (loading || loadError) return;
    if (planType === "free") {
      toast.info(
        hasTalentPublicAccess(entitlement)
          ? "Your Public Listing is active. Contact support if you want to cancel it."
          : "You're already on the Free plan.",
      );
      return;
    }

    if (hasTalentPublicAccess(entitlement)) {
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

  const live = hasTalentPublicAccess(entitlement);
  const displayPublic = hasTalentPublicAccess(entitlement);
  // The server publishes free portfolios independently of paid subscription access.
  const portfolioUrl = publicPortfolio?.status === "published" && typeof publicPortfolio.url === "string"
    && /^\/[^/?#\\\s]+$/.test(publicPortfolio.url) ? publicPortfolio.url : null;

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
          <TalentPublicProfileAccess state={entitlement} />
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
            <p className="text-gray-400 text-sm mb-1">Public portfolio</p>
            <p className="text-white font-semibold">
              {portfolioUrl ? "Visible" : publicPortfolio?.status === "unavailable" ? "Unavailable" : "Status could not be loaded"}
            </p>
            {publicPortfolio?.reason === "username_missing" && <div className="mt-3">
              <button
                type="button"
                onClick={handlePortfolioSetup}
                disabled={settingUp || loading || processing}
                aria-busy={settingUp} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-blue-400 hover:bg-blue-600/10 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50">
                {settingUp && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {settingUp ? "Setting up portfolio..." : "Set up free portfolio"}
              </button>
              {settingUp && <p role="status" className="mt-2 text-sm text-gray-400">Setting up your portfolio username...</p>}
            </div>}
            {portfolioUrl && (
              <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 break-all inline-block mt-2">
                {window.location.origin}{portfolioUrl}
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
