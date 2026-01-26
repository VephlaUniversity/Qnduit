import { useState } from "react";
import { EmployerPlans } from "../EmployerPlans";
import { useNavigate } from "react-router-dom";
import { TalentPlans } from "../TalentPlans";

export const PricingSection = () => {
  const [pricingToggle, setPricingToggle] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const navigate = useNavigate();
  const handlePlanAction = (planType) => {
    if (planType === "free") {
      navigate("/signup?plan=free");
    } else if (planType === "public") {
      navigate("/payment", { state: { plan: planType, price: 1.99 } });
    } else if (planType === "bronze") {
      navigate("/payment", { state: { plan: planType, price: 6.99 } });
    } else if (planType === "silver") {
      navigate("/payment", { state: { plan: planType, price: 8.99 } });
    } else if (planType === "platinum") {
      navigate("/payment", { state: { plan: planType, price: 12.99 } });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl mb-8">
          Pricing based on
          <br />
          your Success
        </h2>

        <div className="flex items-center justify-center mb-12">
          <span
            className={`text-lg mr-4 ${
              !pricingToggle ? "text-white" : "text-gray-300"
            }`}
          >
            For Employers
          </span>
          <button
            onClick={() => setPricingToggle(!pricingToggle)}
            className="relative w-20 h-10 rounded-full focus:outline-none transition-colors duration-300 cursor-pointer"
            style={{ backgroundColor: pricingToggle ? "#F5C518" : "#3B82F6" }}
          >
            <div
              className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${
                pricingToggle ? "left-11" : "left-1"
              }`}
            ></div>
          </button>
          <span
            className={`text-lg ml-4 ${
              pricingToggle ? "text-white" : "text-gray-300"
            }`}
          >
            For Talents
          </span>
        </div>
      </div>

      <div>
        {pricingToggle ? (
          // For Talents Pricing
          <TalentPlans
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPlanAction={handlePlanAction}
          />
        ) : (
          // For Employers Pricing
          <EmployerPlans
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPlanAction={handlePlanAction}
          />
        )}
      </div>
    </section>
  );
};
