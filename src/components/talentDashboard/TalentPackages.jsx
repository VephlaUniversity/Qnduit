import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTalentSubscription, hasCurrentPublicSubscription } from "../hooks/useTalentSubscription";
import { TalentPlans } from "../TalentPlans";

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
      alert("Please select a plan first.");
      return;
    }

    if (planType === "free") {
      navigate("/talent-dashboard/my-plan?plan=free");
      return;
    }

    if (loading || error) return;
    if (currentPlan) {
      navigate("/talent-dashboard/my-plan");
      return;
    }
    if (actionType === "payNow") {
      navigate(
        `/payment?plan=${encodeURIComponent(planType)}&userType=talent`
      );
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">My Packages</h1>
      <p className="text-gray-400 mb-8">
        Choose a package to improve your visibility on QNDUIT.
      </p>

      {loading && <p className="text-gray-400 mb-4">Loading your plan...</p>}
      {error && <div className="text-gray-400 mb-4" role="alert">{error} <button type="button" onClick={refresh} className="text-blue-400">Try again</button></div>}
      <TalentPlans
        selectedPlan={currentPlan ? "public" : selectedPlan}
        alwaysActive={currentPlan}
        publicCtaText="View My Plan"
        onSelectPlan={setSelectedPlan}
        onPlanAction={handlePlanAction}
      />
    </div>
  );
};

export default TalentPackages;