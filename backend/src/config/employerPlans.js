import process from "node:process";

export const EMPLOYER_PLANS = {
  bronze: {
    amount: 6.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_BRONZE_PLAN_ID
    ),
  },

  silver: {
    amount: 8.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_SILVER_PLAN_ID
    ),
  },

  platinum: {
    amount: 12.99,
    currency: "USD",
    paymentPlanId: Number(
      process.env.FLW_EMPLOYER_PLATINUM_PLAN_ID
    ),
  },
};
