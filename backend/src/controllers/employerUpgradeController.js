import jwt from "jsonwebtoken";
import { Buffer } from "node:buffer";
import process from "node:process";
import Employer from "../models/Employer.js";
import flutterwave from "../utils/flutterwave.js";
import { EMPLOYER_PLANS } from "../config/employerPlans.js";
import { UPGRADE_AUDIENCE, UPGRADE_POLICY, initiateEmployerUpgrade, completeEmployerUpgradeCheckout } from "../services/employerUpgrade.js";

export { UPGRADE_AUDIENCE };

const CHALLENGE_SCAN_BYTES = 16 * 1024;

function logProviderCheckoutFailure(requestId, response) {
  const headers = response?.headers;
  const contentType = headers?.["content-type"];
  // Keep the media type and omit parameters that can contain arbitrary text.
  const mediaType = typeof contentType === "string" && contentType.length <= 256
    ? contentType.split(";", 1)[0].trim().toLowerCase()
    : "";
  const ray = headers?.["cf-ray"];
  const mitigated = headers?.["cf-mitigated"] === "challenge" ? "challenge" : null;
  const body = mediaType === "text/html" && mitigated === null ? response?.data : null;
  // Bound the string before encoding, then enforce the UTF-8 byte limit.
  const htmlPrefix = typeof body === "string"
    ? Buffer.from(body.slice(0, CHALLENGE_SCAN_BYTES)).subarray(0, CHALLENGE_SCAN_BYTES).toString("utf8")
    : "";
  const challengePage = /(?:_cf_chl_opt|\/cdn-cgi\/challenge-platform\/|<title>\s*Just a moment)/i.test(htmlPrefix);

  console.error(JSON.stringify({
    event: "employer_upgrade_checkout_provider_failure",
    timestamp: new Date().toISOString(),
    requestId,
    upstreamStatus: Number.isInteger(response?.status) && response.status >= 100 && response.status <= 599 ? response.status : null,
    contentType: /^[a-z]{1,16}\/[a-z0-9][a-z0-9.+-]{0,63}$/.test(mediaType) ? mediaType : null,
    "cf-ray": typeof ray === "string" && ray.length <= 20 && /^[a-f0-9]{16}(?:-[a-z]{3})?$/i.test(ray) ? ray : null,
    "cf-mitigated": mitigated,
    cloudflareChallenge: mitigated === "challenge" || challengePage,
  }));
}

export async function createEmployerUpgradeCheckout(req, res, next) {
  res.set("Cache-Control", "private, no-store");
  try {
    if (req.user?.role !== "employer") return res.status(403).json({ success: false, code: "SUBSCRIPTION_UPGRADE_NOT_ALLOWED", message: "Only Employers can purchase upgrades." });
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !["plan", "requestId", "previewToken"].includes(key))) return res.status(400).json({ success: false, code: "SUBSCRIPTION_REQUEST_INVALID", message: "Only a plan, request ID and preview token are accepted." });
    let selected;
    try { selected = jwt.verify(req.body.previewToken, process.env.JWT_SECRET, { algorithms: ["HS256"], audience: UPGRADE_AUDIENCE, subject: String(req.user._id) }); } catch { return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "Refresh your plan before checkout." }); }
    if (selected.executionPolicy !== UPGRADE_POLICY || selected.accountId !== String(req.user._id)) return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "The upgrade confirmation belongs to another account." });
    const price = Object.hasOwn(EMPLOYER_PLANS, req.body.plan) ? EMPLOYER_PLANS[req.body.plan] : null;
    const result = await initiateEmployerUpgrade({ authenticatedUser: req.user, plan: req.body.plan, requestId: req.body.requestId, selected, price });
    if (!result.created) {
      if (!result.stale && result.request.status === "awaiting_payment" && result.payment.metadata?.checkoutState === "ready") return res.json({ success: true, replayed: true, checkoutUrl: result.payment.metadata.checkoutUrl, requestId: result.request.requestId });
      return res.status(409).json({ success: false, code: "SUBSCRIPTION_CHECKOUT_UNCONFIRMED", message: "This checkout already exists. Refresh status to resume a saved checkout. If no link appears, contact Support with your request reference; do not start another payment." });
    }
    const account = await Employer.findById(req.user._id).select("email displayName firstName lastName phone").lean();
    let checkoutUrl;
    let providerResponse;
    try {
      providerResponse = await flutterwave.post("/payments", { tx_ref: result.payment.txRef, amount: price.amount, currency: price.currency, payment_plan: price.paymentPlanId,
        redirect_url: `${process.env.BACKEND_URL}/api/payments/employer/payment/callback`, customer: { email: account.email, name: account.displayName || `${account.firstName||""} ${account.lastName||""}`.trim(), phonenumber: account.phone || undefined },
        customizations: { title: "Qnduit Employer Plan", description: `${req.body.plan} employer plan` }, meta: { employerId: String(req.user._id), plan: req.body.plan, txRef: result.payment.txRef }, configurations: { session_duration: 10, max_retry_attempt: 5 } });
      const link = providerResponse.data?.data?.link;
      if (typeof link !== "string" || !/^https?:\/\//i.test(link)) throw Error("Checkout URL unavailable");
      checkoutUrl = link;
      const state = await completeEmployerUpgradeCheckout({ accountId: String(req.user._id), paymentId: result.payment._id, checkoutUrl });
      if (!state.current) return res.status(409).json({ success: false, code: "SUBSCRIPTION_SELECTION_STALE", message: "Your subscription changed during checkout initialization. Refresh to review its status." });
      return res.json({ success: true, checkoutUrl, requestId: result.request.requestId });
    } catch (error) {
      if (!checkoutUrl) {
        try {
          logProviderCheckoutFailure(result.request.requestId, error?.response ?? providerResponse);
        } catch {
          // Diagnostics must never interrupt checkout recovery.
        }
      }
      await completeEmployerUpgradeCheckout({ accountId: String(req.user._id), paymentId: result.payment._id, checkoutUrl, uncertain: true }).catch(() => {});
      throw Object.assign(new Error("Checkout initialization is unconfirmed. Refresh status to recover a saved link. If none appears, contact Support with your request reference before making another payment."), { status: 503, code: "SUBSCRIPTION_CHECKOUT_UNCONFIRMED", cause: error });
    }
  } catch (error) {
    if (typeof error.code === "string" && error.code.startsWith("SUBSCRIPTION_")) return res.status(error.status || 503).json({ success: false, code: error.code, message: error.message });
    next(error);
  }
}
