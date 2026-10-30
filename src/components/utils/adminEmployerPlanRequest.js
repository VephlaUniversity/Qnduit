const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";
const plans = ["free", "bronze", "silver", "platinum"];

export function createAdminEmployerPlanRequestSession({ client, baseUrl, readOwner, makeId = () => crypto.randomUUID() }) {
  let version = 0, controller, sending = false;
  const attempts = new Map();
  const cancel = () => { version++; controller?.abort(); };
  const valid = target => target?.type === "employer" && /^[a-f\d]{24}$/i.test(target.accountId || "");
  const endpoint = target => `${baseUrl}/api/admin/subscriptions/employer/${target.accountId}/plan-request`;
  const owner = () => { const value = readOwner(); return value?.actor?.startsWith("admin:") && value.token ? value : null; };
  const keyFor = (identity, target) => `${ownerKey(identity)}:${target.accountId}`;
  return {
    cancel,
    async load(target, update) {
      if (sending) return;
      cancel(); const identity = owner(), key = ownerKey(identity), epoch = version;
      if (!identity || !valid(target)) { update({ status: "error", message: "A valid Admin and selected Employer are required." }); return; }
      controller = new AbortController(); const signal = controller.signal;
      const current = () => !signal.aborted && version === epoch && key === ownerKey(readOwner());
      update({ status: "loading" });
      try {
        const { data } = await client.get(endpoint(target), { signal, headers: { Authorization: `Bearer ${identity.token}` } });
        if (!current()) return;
        if (data?.success !== true || data.subscription?.accountId !== target.accountId || data.subscription?.role !== "employer"
            || !plans.includes(data.currentPlan) || !data.previewToken || !Array.isArray(data.allowedPlans)
            || data.pendingRequest && data.pendingRequest.employerId !== target.accountId) throw Error("The selected Employer could not be confirmed.");
        const pending = data.pendingRequest; let attempt = attempts.get(keyFor(identity, target));
        if (attempt && data.latestAction?.requestId === attempt.requestId) { attempts.delete(keyFor(identity, target)); attempt = null; }
        const allowedPlans = data.allowedPlans.filter(plan => plans.includes(plan) && plans.indexOf(plan) < plans.indexOf(data.currentPlan));
        update({ status: attempt?.uncertain ? "unconfirmed" : "ready", subscription: data.subscription,
          previewToken: data.previewToken, allowedPlans, pending, latestAction: data.latestAction, toPlan: attempt?.toPlan || "",
          lockedPlan: Boolean(attempt?.uncertain) });
      } catch (error) {
        if (current()) update({ status: "error", message: error.response?.data?.message || "Unable to load the selected Employer." });
      }
    },
    async send(target, preview, update, saved) {
      if (sending || !valid(target) || preview.subscription?.accountId !== target.accountId || !preview.previewToken ||
          !["ready", "retry", "unconfirmed"].includes(preview.status) || !preview.allowedPlans?.includes(preview.toPlan)) return;
      const identity = owner(); if (!identity) return;
      const key = ownerKey(identity), epoch = version, attemptKey = keyFor(identity, target);
      let attempt = attempts.get(attemptKey);
      if (attempt?.uncertain && attempt.toPlan !== preview.toPlan) return;
      if (!attempt || attempt.toPlan !== preview.toPlan) attempt = { requestId: makeId(), toPlan: preview.toPlan, fromPlan: preview.subscription.plan };
      attempts.set(attemptKey, attempt);
      controller = new AbortController(); const signal = controller.signal;
      const current = () => !signal.aborted && version === epoch && key === ownerKey(readOwner());
      sending = true; update({ ...preview, status: "sending" });
      try {
        const { data } = await client.post(endpoint(target), { requestId: attempt.requestId, toPlan: attempt.toPlan, previewToken: preview.previewToken },
          { signal, headers: { Authorization: `Bearer ${identity.token}` } });
        if (!current()) return;
        if (data?.success !== true || data.request?.employerId !== target.accountId || data.request.status !== "applied" || data.request.appliedPlan !== preview.toPlan || !data.request.actualEffectiveAt
            || data.request.toPlan !== preview.toPlan || data.request.fromPlan !== attempt.fromPlan) throw Error("The request could not be confirmed.");
        attempts.delete(attemptKey);
        update({ ...preview, status: "recorded", applied: data.request, subscription: { ...preview.subscription, plan: data.replayed ? preview.subscription.plan : data.request.appliedPlan, status: data.request.appliedPlan === "free" ? "cancelled" : "active" }, message: "Downgrade applied immediately." });
        saved?.();
      } catch (error) {
        if (!current()) return;
        const status = error.response?.status;
        attempt.uncertain = ![400, 401, 403, 404, 409, 429].includes(status);
        update({ ...preview, lockedPlan: attempt.uncertain,
          status: error.response?.data?.code === "SUBSCRIPTION_SELECTION_STALE" ? "stale" : status === 429 ? "retry" : attempt.uncertain ? "unconfirmed" : "error",
          message: error.response?.data?.message || "Outcome unconfirmed. Refresh status or retry this same request." });
      } finally { sending = false; }
    },
  };
}
