import process from "node:process";

export const TALENT_PLANS = {
  public: {
    amount: 1.99,
    currency: "USD",
    paymentPlanId: Number(process.env.FLW_TALENT_PUBLIC_PLAN_ID),
  },
};
