
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmployerPlans } from "../EmployerPlans";

export const MyPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
  };

  const handlePlanAction = async (planType, actionType) => {
    const token = localStorage.getItem("token");

    if (!planType) {
      alert("Please select a plan first");
      return;
    }

    if (!token) {
      alert("Your session has expired. Please log in again.");
      return;
    }

    if (actionType === "payNow") {
      navigate(
        `/payment?plan=${encodeURIComponent(planType)}&userType=employer`
      );
      return;
    }

    if (actionType === "payLater") {
      setLoading(true);

      try {
        // Keep pay-later behavior aligned with your backend.
        // Do not reload before the plan is saved.
        navigate(
          `/payment?plan=${encodeURIComponent(planType)}&userType=employer`
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            My Package
          </h1>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Continue Using Quota
        </button>
      </div>

      <EmployerPlans
        selectedPlan={selectedPlan}
        onSelectPlan={handleSelectPlan}
        onPlanAction={handlePlanAction}
      />

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111827] text-white px-6 py-4 rounded-lg">
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPackages;
