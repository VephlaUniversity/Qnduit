import React from "react";
import { Check } from "lucide-react";

export const SubmitJob = () => {
  const plans = [
    {
      name: "Basic",
      price: 19.0,
      popular: false,
      features: [
        "30 Job posting",
        "3 featured job",
        "Job displayed for 15 days",
        "Premium Support 24/7",
      ],
    },
    {
      name: "Standard",
      price: 39.0,
      popular: true,
      features: [
        "40 Job posting",
        "5 featured job",
        "Job displayed for 30 days",
        "Premium Support 24/7",
      ],
    },
    {
      name: "Extended",
      price: 79.0,
      popular: false,
      features: [
        "50 Job posting",
        "10 featured job",
        "Job displayed for 60 days",
        "Premium Support 24/7",
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Submit Job
          </h1>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Continue Using Quota
        </button>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-[#1A1A1E] rounded-lg p-8 border ${
              plan.popular ? "border-white/5" : "border-white/5"
            } relative`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                  POPULAR
                </span>
              </div>
            )}

            <div className="text-center mb-8">
              <h3 className="text-white text-xl font-medium mb-4">
                {plan.name}
              </h3>
              <div className="mb-2">
                <span className="text-white text-4xl font-bold">
                  ${plan.price.toFixed(2)}
                </span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-white">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                plan.popular
                  ? "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                  : "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              }`}
            >
              {plan.popular ? "Current Plan" : "Choose Plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubmitJob;
