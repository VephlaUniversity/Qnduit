import { motion } from "framer-motion";
import { EmployerPlans } from "../EmployerPlans";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { routeForPlan } from "../utils/planChoice";
import { useState } from "react";

export const EmployerPricing = () => {
  const [selectedPlan, setSelectedPlan] = useState("");
  const navigate = useNavigate();

  const handlePlanAction = (planType) => {
    const result = routeForPlan(planType);
    if (result.to) navigate(result.to);
    else toast.error(result.message);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-4xl lg:text-5xl mb-4">
          Pricing based on
          <br />
          your Success
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <EmployerPlans
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          onPlanAction={handlePlanAction}
          alwaysActive
        />
      </motion.div>
    </section>
  );
};
