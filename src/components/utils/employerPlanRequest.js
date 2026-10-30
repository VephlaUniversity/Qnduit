export function validCheckoutUrl(value) {
  try { const url=new URL(value); return url.protocol==="https:" || url.protocol==="http:" && ["127.0.0.1","localhost"].includes(url.hostname); } catch { return false; }
}
const plans = ["free", "bronze", "silver", "platinum"];
export const employerRequestAction = (from, to) => plans.indexOf(to) > plans.indexOf(from) ? "upgrade" : "downgrade";
const key = owner => owner ? `${owner.actor}:${owner.token}` : "";

export function createEmployerPlanRequestSession({ client, baseUrl, readOwner, makeId = () => crypto.randomUUID() }) {
  let context, attempt, uncertain = false, sending = false, version = 0, controller;
  const endpoint = `${baseUrl}/api/payments/employer/plan-requests`;
  const begin = () => {
    controller?.abort(); controller = new AbortController();
    const owner = readOwner(), ownerKey = key(owner), capturedVersion = ++version;
    if (!owner?.actor?.startsWith("employer:") || !owner.token) throw new client.CanceledError("Employer session changed");
    return { owner, signal: controller.signal, current: () => !controller.signal.aborted && version === capturedVersion && key(readOwner()) === ownerKey };
  };
  const validRequest = (request, owner) => request?.employerId === owner.actor.slice(9)
    && typeof request.id === "string" && plans.includes(request.fromPlan) && plans.includes(request.toPlan)
    && ["pending", "awaiting_payment", "scheduled", "applied"].includes(request.status);
  return {
    cancel() { version++; controller?.abort(); },
    async load(update) {
      if (sending) return;
      const { owner, signal, current } = begin();
      update({ status: "loading" });
      try {
        const { data } = await client.get(endpoint, { signal, headers: { Authorization: `Bearer ${owner.token}` } });
        if (!current()) return;
        if (data?.success !== true || data.accountId !== owner.actor.slice(9) || !plans.includes(data.currentPlan)
            || !data.previewToken || data.pendingRequest && !validRequest(data.pendingRequest, owner)) throw Error("Your request status could not be confirmed.");
        context = data;
        if (attempt && (data.latestAction?.requestId === attempt.requestId || data.upgradeRequest?.requestId === attempt.requestId)) { attempt = null; uncertain = false; }
        update({ status: uncertain ? "unconfirmed" : "ready", data, toPlan: attempt?.toPlan,
          operation: attempt?.mode, message: uncertain ? "The earlier submission is unconfirmed. Retry the same request to confirm its outcome." : "" });
      } catch (error) {
        if (current()) update({ status: "error", message: error.response?.data?.message || "Unable to load plan requests. Try again." });
      }
    },
    async upgrade(toPlan, update, navigate) {
      if (sending || !context?.upgradePlans?.includes(toPlan) || context.upgradeRequest?.status === "awaiting_payment") return;
      if (uncertain && (attempt?.toPlan !== toPlan || attempt?.mode !== "upgrade")) return;
      const { owner, signal, current } = begin();
      attempt = attempt?.mode === "upgrade" && attempt.toPlan === toPlan ? attempt : { mode: "upgrade", toPlan, requestId: makeId() };
      sending = true; update({ status: "sending", operation: "upgrade", data: context, toPlan });
      try {
        const { data } = await client.post(`${baseUrl}/api/payments/employer/create-checkout`, { plan: toPlan, requestId: attempt.requestId, previewToken: context.upgradePreviewToken },
          { signal, headers: { Authorization: `Bearer ${owner.token}` } });
        if (!current()) return;
        if (data?.success !== true || data.requestId !== attempt.requestId || !validCheckoutUrl(data.checkoutUrl)) throw Error("Checkout outcome could not be confirmed.");
        uncertain = false; update({ status: "checkout", operation: "upgrade", data: context, toPlan, message: "Opening checkout. Your current access stays unchanged until verified payment." });
        navigate(data.checkoutUrl);
      } catch (error) {
        if (!current()) return;
        const status = error.response?.status; uncertain = ![400,401,403,404,409,429].includes(status);
        update({ status: uncertain ? "unconfirmed" : "error", operation: "upgrade", data: context, toPlan,
          message: error.response?.data?.message || "Checkout unconfirmed. Refresh before retrying the same upgrade." });
      } finally { sending = false; }
    },
    async send(toPlan, update, saved) {
      if (sending || !context || !context.allowedPlans?.includes(toPlan) || !plans.includes(toPlan) || plans.indexOf(toPlan) >= plans.indexOf(context.currentPlan)) return;
      if (uncertain && attempt?.toPlan !== toPlan) return;
      const { owner, signal, current } = begin();
      attempt = attempt?.toPlan === toPlan ? attempt : { toPlan, requestId: makeId(), fromPlan: context.currentPlan };
      sending = true;
      update({ status: "sending", data: context, toPlan });
      try {
        const { data } = await client.post(endpoint, { toPlan: attempt.toPlan, requestId: attempt.requestId, previewToken: context.previewToken },
          { signal, headers: { Authorization: `Bearer ${owner.token}` } });
        if (!current()) return;
        if (data?.success !== true || !validRequest(data.request, owner) || data.request.toPlan !== toPlan
            || data.request.fromPlan !== attempt.fromPlan || data.request.status !== "applied" || data.request.appliedPlan !== toPlan || !data.request.actualEffectiveAt) throw Error("The submission could not be confirmed.");
        context = { ...context, currentPlan: data.replayed ? context.currentPlan : toPlan, allowedPlans: plans.filter(plan => plans.indexOf(plan) < plans.indexOf(toPlan)), latestAction: data.request }; uncertain = false; attempt = null;
        update({ status: "recorded", data: context, toPlan, message: "Downgrade applied. Your access has changed immediately." });
        saved?.();
      } catch (error) {
        if (!current()) return;
        const status = error.response?.status;
        uncertain = ![400, 401, 403, 404, 409, 429].includes(status);
        update({ status: uncertain ? "unconfirmed" : status === 429 ? "retry" : "error", data: context, toPlan,
          message: error.response?.data?.message || "Submission unconfirmed. Refresh the request status or retry this same request." });
      } finally { sending = false; }
    },
  };
}
