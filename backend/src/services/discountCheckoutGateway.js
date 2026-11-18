import flutterwave from "../utils/flutterwave.js";

const request = { timeout: 12_000, maxRedirects: 0 };

export function isHostedDiscountCheckoutUrl(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.origin === "https://checkout.flutterwave.com" && !url.username && !url.password &&
      /^\/v3\/hosted\/pay\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export async function readDiscountRecurringPlan(planId) {
  const response = await flutterwave.get(`/payment-plans/${planId}`, request);
  return response.data?.status === "success" ? response.data.data : null;
}

export async function requestDiscountHostedCheckout(payload) {
  try {
    const response = await flutterwave.post("/payments", payload, request);
    if (response.data?.status !== "success") return { state: "unconfirmed" };
    const data = response.data.data;
    return { state: "ready", checkoutUrl: data?.link, providerExpiresAt: data?.expires_at ?? data?.link_expiration };
  } catch (error) {
    // Authentication/authorization rejection is definite. Other replies, including
    // duplicate references, can leave an earlier link collectible.
    return { state: [401, 403].includes(error.response?.status) ? "rejected" : "unconfirmed" };
  }
}
