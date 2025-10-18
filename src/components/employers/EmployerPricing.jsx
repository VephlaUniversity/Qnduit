import { EmployerPlans } from "../EmployerPlans";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
export const EmployerPricing = () => {
  const [selectedPlan, setSelectedPlan] = useState("");
  const navigate = useNavigate();
  const handlePlanAction = (planType) => {
    if (planType === "bronze") {
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
        <h2 className="text-4xl lg:text-5xl mb-4">
          Pricing based on
          <br />
          your Success
        </h2>
      </div>
      <EmployerPlans
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        onPlanAction={handlePlanAction}
      />
    </section>
  );
};
