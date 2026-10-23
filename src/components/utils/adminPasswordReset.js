const ownerKey = owner => owner ? `${owner.actor}:${owner.token}` : "";
export const validResetTarget = subject => ["talent", "employer"].includes(subject?.type)
  && typeof subject.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject.email);

// POST is sent only by an explicit confirmation. Cancelling the client cannot
// recall an email the server has already accepted. No API body reaches the UI.
export function createAdminResetSession({ client, baseUrl, readOwner, safety, onPending = () => {} }) {
  let inFlight, version = 0;
  const cancel = () => { version++; inFlight?.controller.abort(); };
  return {
    cancel,
    async send(subject, update) {
      if (inFlight) return;
      const owner = readOwner(), key = ownerKey(owner);
      if (!owner?.token || !owner.actor?.startsWith("admin:")) { update("expired"); return; }
      if (!validResetTarget(subject)) { update("invalid"); return; }
      const reason = safety.blocked(owner.actor, true, false, true);
      if (reason) { update(reason === "ACCOUNT_SUSPENDED" ? "forbidden" : "limited"); return; }
      const context = { controller: new AbortController(), version: ++version };
      const current = () => context.version === version && !context.controller.signal.aborted && key === ownerKey(readOwner());
      inFlight = context; onPending(true); update("sending");
      try {
        const response = await client.post(`${baseUrl}/api/auth/forgot-password`, { email: subject.email, userType: subject.type }, {
          headers: { Authorization: `Bearer ${owner.token}` }, signal: context.controller.signal,
        });
        if (current()) update(response.data?.success === true ? "requested" : "unconfirmed");
      } catch (error) {
        if (current()) {
          const status = error.response?.status;
          update(status === 429 ? "limited" : status === 400 ? "invalid" : status === 401 ? "expired" : status === 403 ? "forbidden"
            : error.response?.data?.code === "RESET_EMAIL_FAILED" ? "delivery-error" : "unconfirmed");
        }
      } finally { if (inFlight === context) { inFlight = null; onPending(false); } }
    },
  };
}
