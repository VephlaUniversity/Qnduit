const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";

export function createAdminSubscriptionActionSession({ client, baseUrl, readOwner, action = "cancel", makeId = () => crypto.randomUUID() }) {
  if (!["cancel", "downgrade"].includes(action)) throw Error("Unsupported subscription action");
  const isDowngrade = action === "downgrade";
  let version = 0, controller, sending = false, requestId;
  const cancel = () => { version++; controller?.abort(); };
  const valid = target => ["talent", "employer"].includes(target?.type) && /^[a-f\d]{24}$/i.test(target?.accountId || "");
  const endpoint = target => `${baseUrl}/api/admin/subscriptions/${target.type}/${target.accountId}/${action}`;
  const owned = () => { const owner = readOwner(); return owner?.actor?.startsWith("admin:") && owner.token ? owner : null; };
  return {
    cancel,
    async load(target, update) {
      cancel(); requestId = makeId();
      const owner = owned(), key = ownerKey(owner), generation = version;
      if (!owner || !valid(target)) { update({ status: "error", message: "A valid admin session and selected account are required." }); return; }
      controller = new AbortController(); const signal = controller.signal;
      const current = () => !signal.aborted && generation === version && key === ownerKey(readOwner());
      update({ status: "loading" });
      try {
        const response = await client.get(endpoint(target), { headers: { Authorization: `Bearer ${owner.token}` }, signal });
        if (!current()) return;
        const { subscription, previewToken, lowerPlans, pending } = response.data || {};
        if (response.data?.success !== true || subscription?.accountId !== target.accountId || subscription?.role !== target.type || !previewToken
          || isDowngrade && !Array.isArray(lowerPlans)) throw Error("Invalid confirmation");
        update({ status: "ready", subscription, previewToken, ...(isDowngrade ? { lowerPlans, pending, toPlan: pending?.toPlan || "" } : {}) });
      } catch (error) {
        if (current()) update({ status: "error", message: error.response?.data?.message || "Unable to load the subscription confirmation." });
      }
    },
    async send(target, preview, update, saved) {
      if (sending || !valid(target) || !preview.previewToken || !["ready", "unconfirmed", "retry"].includes(preview.status)) return;
      if (isDowngrade && (preview.pending || !preview.lowerPlans?.includes(preview.toPlan))) return;
      const owner = owned(); if (!owner) { update({ ...preview, status: "error", message: "Your admin session is unavailable." }); return; }
      const key = ownerKey(owner), generation = version, operationId = requestId;
      controller = new AbortController(); const signal = controller.signal;
      const current = () => !signal.aborted && generation === version && key === ownerKey(readOwner());
      sending = true; update({ ...preview, status: "sending" });
      try {
        const response = await client.post(endpoint(target), { previewToken: preview.previewToken,
          ...(isDowngrade ? { toPlan: preview.toPlan } : { requestId: operationId }) }, {
          headers: { Authorization: `Bearer ${owner.token}` }, signal,
        });
        if (!current()) return;
        if (response.data?.success !== true || (isDowngrade
          ? response.data.request?.status !== "pending" || response.data.request?.toPlan !== preview.toPlan || response.data.request?.fromPlan !== preview.subscription.plan
          : response.data.status !== "canceled")) throw Error("Unconfirmed subscription action");
        update({ ...preview, status: isDowngrade ? "recorded" : "cancelled", ...(isDowngrade ? { pending: response.data.request } : {}),
          message: isDowngrade ? "Downgrade request saved." : "Application subscription cancelled.",
          ...(!isDowngrade && response.data.replayed && response.data.superseded
            ? { notice: "The selected subscription was already cancelled. A newer subscription state was left unchanged." } : {}) });
        saved?.();
      } catch (error) {
        if (!current()) return;
        const status = error.response?.status, code = error.response?.data?.code;
        update({ ...preview, status: code === "SUBSCRIPTION_SELECTION_STALE" ? "stale" : status === 429 ? "retry" : [400, 401, 403, 404, 409].includes(status) ? "error" : "unconfirmed",
          message: error.response?.data?.message || "The subscription request could not be confirmed. Refresh to check its state or deliberately retry this same request." });
      } finally { sending = false; }
    },
  };
}
