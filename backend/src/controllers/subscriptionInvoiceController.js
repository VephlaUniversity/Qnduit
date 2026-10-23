import { previewSubscriptionInvoice, sendInvoice } from "../services/subscriptionInvoice.js";

const respond = async (req, res, sending) => {
  res.set("Cache-Control", "private, no-store");
  try {
    if (sending && (!req.body || Object.keys(req.body).some(key => !["previewToken", "requestId"].includes(key)))) {
      return res.status(400).json({ success: false, code: "INVALID_INVOICE_REQUEST", message: "Only the preview token and request ID may be supplied." });
    }
    const target = { role: req.params.role, accountId: req.params.accountId, adminId: String(req.user._id) };
    const result = sending ? await sendInvoice({ ...target, previewToken: req.body.previewToken, requestId: req.body.requestId })
      : { success: true, ...await previewSubscriptionInvoice(target) };
    return res.status(sending ? 202 : 200).json(result);
  } catch (error) {
    if (error.retryAt) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((new Date(error.retryAt).getTime() - Date.now()) / 1000))));
      res.set("RateLimit-Scope", "invoice-payment");
    }
    // Provider/database payloads, message bodies and recipient data never escape.
    const expected = error.code?.startsWith?.("INVOICE_") || error.code?.startsWith?.("INVALID_INVOICE_");
    return res.status(expected ? error.status : 503).json({ success: false,
      code: expected ? error.code : "INVOICE_SERVICE_UNAVAILABLE",
      message: expected ? error.message : "Invoice service is temporarily unavailable. Refresh the preview before trying again.",
    });
  }
};
export const previewInvoice = (req, res) => respond(req, res, false);
export const emailInvoice = (req, res) => respond(req, res, true);
