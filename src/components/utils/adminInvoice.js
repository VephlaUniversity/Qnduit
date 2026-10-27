import { retryAfterMs } from "./pollingCooldown.js";

const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";
export function createAdminInvoiceSession({ client, baseUrl, readOwner, makeId = () => crypto.randomUUID(), now = Date.now }) {
  let version = 0, controller, sending = false;
  const cancel = () => { version++; controller?.abort(); };
  const targetValid = target => ["talent", "employer"].includes(target?.type) && /^[a-f\d]{24}$/i.test(target?.accountId || "");
  const endpoint = target => `${baseUrl}/api/admin/subscriptions/${target.type}/${target.accountId}/invoice-email`;
  const owned = () => { const owner = readOwner(); return owner?.actor?.startsWith("admin:") && owner.token ? owner : null; };
  return {
    cancel,
    async load(target, update) {
      cancel();
      const owner = owned(), key = ownerKey(owner), generation = version;
      if (!owner || !targetValid(target)) { update({ status: "error", message: "A valid admin session and selected account are required." }); return; }
      controller = new AbortController();
      const signal = controller.signal;
      const current = () => !signal.aborted && generation === version && key === ownerKey(readOwner());
      update({ status: "loading" });
      try {
        const response = await client.get(endpoint(target), { headers: { Authorization: `Bearer ${owner.token}` }, signal });
        if (!current()) return;
        const { invoice, previewToken, delivery } = response.data || {};
        if (response.data?.success !== true || invoice?.accountId !== target.accountId || invoice?.role !== target.type || !previewToken) throw Error("Invalid preview");
        update({ status: "ready", invoice, previewToken, blocked: delivery?.blocked === true,
          until: now() + Math.max(0, Number(delivery?.retryAfterSeconds) || 0) * 1000 });
      } catch (error) {
        if (current()) update({ status: "error", message: error.response?.data?.message || "Unable to load the invoice preview. Please refresh deliberately." });
      }
    },
    async send(target, preview, update) {
      if (sending || !targetValid(target) || !preview.previewToken) return;
      const owner = owned(); if (!owner) { update({ ...preview, status: "error", message: "Your admin session is unavailable." }); return; }
      const key = ownerKey(owner), generation = version;
      controller = new AbortController(); const signal = controller.signal;
      const current = () => !signal.aborted && generation === version && key === ownerKey(readOwner());
      sending = true; update({ ...preview, status: "sending" });
      try {
        const response = await client.post(endpoint(target), { previewToken: preview.previewToken, requestId: makeId() }, {
          headers: { Authorization: `Bearer ${owner.token}` }, signal,
        });
        if (current()) update({ ...preview, status: response.data?.success === true ? "requested" : "unconfirmed",
          message: response.data?.success === true ? "Invoice email sent successfully." : "The invoice request could not be confirmed. Check the inbox before another send." });
      } catch (error) {
        if (current()) {
          const code = error.response?.data?.code;
          const definite = ["INVOICE_EMAIL_FAILED", "INVOICE_RESEND_LIMITED"].includes(code);
          const rejected = [400, 401, 403, 404, 422].includes(error.response?.status) || code === "INVOICE_EVIDENCE_UNAVAILABLE" || code === "INVOICE_PAYMENT_AMBIGUOUS" || code === "INVOICE_SUBSCRIPTION_AMBIGUOUS";
          const delay = retryAfterMs(error.response?.headers?.["retry-after"] ?? error.response?.headers?.["Retry-After"], error.response?.headers?.date, now()) || 0;
          update({ ...preview, status: definite ? "retry" : code === "INVOICE_PREVIEW_STALE" ? "stale" : rejected ? "error" : "unconfirmed",
            until: definite ? now() + delay + 100 : preview.until || 0,
            message: error.response?.data?.message || "The invoice request could not be confirmed. Check the inbox and request review before another send." });
        }
      } finally { sending = false; }
    },
  };
}
