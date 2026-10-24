import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { useEmployerPlanSession } from "./useEmployerSubscription";
import { routeForPlan } from "../utils/planChoice";
import { friendlyError } from "../utils/userMessage";

export function useEmployerPlanAction(expectedOwner, { directCheckout = false } = {}) {
  const navigate = useNavigate();
  const { session, ownerKey } = useEmployerPlanSession(expectedOwner);
  return async (plan, action) => {
    if (!ownerKey) {
      if (expectedOwner !== undefined) return;
      const result = routeForPlan(plan);
      if (result.to) navigate(result.to); else toast.error(result.message);
      return;
    }
    if (action !== "payLater") {
      const result = directCheckout ? { to: `/payment?plan=${encodeURIComponent(plan)}&userType=employer` } : routeForPlan(plan);
      if (result.to) navigate(result.to); else toast.error(result.message);
      return;
    }
    try {
      await session.request("POST", plan);
      toast.success("Your plan has been saved. You can complete payment later.");
      navigate("/dashboard");
    } catch (error) {
      if (!axios.isCancel(error)) toast.error(friendlyError(error, "We couldn't save your plan. Please try again."));
    }
  };
}
