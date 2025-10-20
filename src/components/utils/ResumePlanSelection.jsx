export const resumePlanSelection = (navigate) => {
  const pendingSelection = localStorage.getItem("pendingPlanSelection");

  if (pendingSelection) {
    try {
      const { planType, planDetails, userType } = JSON.parse(pendingSelection);

      // Clear the pending selection
      localStorage.removeItem("pendingPlanSelection");

      // Navigate based on plan type
      if (planType === "free") {
        navigate("/dashboard");
      } else {
        navigate("/payment", {
          state: {
            plan: planType,
            planName: planDetails?.name,
            price: planDetails?.price,
            userType,
          },
        });
      }

      return true;
    } catch (error) {
      console.error("Error resuming plan selection:", error);
      localStorage.removeItem("pendingPlanSelection");
    }
  }

  return false;
};
