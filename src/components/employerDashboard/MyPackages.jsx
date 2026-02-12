import { useState } from "react";
import { EmployerPlans } from "../EmployerPlans";

export const MyPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Read userType and email from auth lives.
  const existingParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const userType = existingParams.get("userType") || "employer";
  const email = existingParams.get("email") || "";

  // Map planType → price so we can pass it to /payment
  const planPrices = {
    bronze: 6.99,
    silver: 8.99,
    platinum: 12.99,
  };

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
  };

  const handlePlanAction = (planType) => {
    const price = planPrices[planType];
    if (price === undefined) return;

    const params = new URLSearchParams({
      planName: planType.charAt(0).toUpperCase() + planType.slice(1),
      price: price.toString(),
      userType,
      email,
    });

    window.location.href = `/payment?${params.toString()}`;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            My Package
          </h1>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Continue Using Quota
        </button>
      </div>

      {/* Employer Plans grid */}
      <EmployerPlans
        selectedPlan={selectedPlan}
        onSelectPlan={handleSelectPlan}
        onPlanAction={handlePlanAction}
      />
    </div>
  );
};

export default MyPackages;
