import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TalentPlans } from "../TalentPlans";

const TalentPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();

  const handlePlanAction = (planType, actionType) => {
    if (!planType) {
      alert("Please select a plan first.");
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

      <TalentPlans
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        onPlanAction={handlePlanAction}
      />
    </div>
  );
};

export default TalentPackages;