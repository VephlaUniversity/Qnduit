import { useState } from "react";
import { EmployerPlans } from "../EmployerPlans";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

export const MyPackages = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

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

    try {
      setLoading(true);

      // PAY NOW
      if (actionType === "payNow") {
        const res = await axios.post(
          `${API_BASE_URL}/api/payments/employer/create-checkout`,
          {
            plan: planType,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
          return;
        }

        throw new Error(
          res.data?.message || "Flutterwave checkout link not received"
        );
      }

      // PAY LATER
      if (actionType === "payLater") {
        window.location.reload();
        return;
      }
    } catch (err) {
      console.error("Plan action error:", err);

      alert(
        err?.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
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

      {/* Employer Plans */}
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