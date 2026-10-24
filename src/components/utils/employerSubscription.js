export const employerPlanName = plan => ({ free: "Free", bronze: "Bronze", silver: "Silver", platinum: "Platinum" })[plan] || "Unavailable";
export const employerStatusName = status => ({ active: "Active", unpaid: "Unpaid", cancelled: "Cancelled / Inactive", expired: "Expired / Inactive", past_due: "Payment overdue / Inactive", inactive: "Inactive", inconsistent: "Payment confirmation unavailable", missing: "Unavailable" })[status] || "Unavailable";
export function employerBillingDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date) : null;
}

// Bind all reads/actions to the captured canonical session. Stale successes and
// failures cannot update another account, navigate it, or replay a mutation.
export function createEmployerSubscriptionSession({ client, baseUrl, readOwner }) {
  const controllers = new Set(); let revision = 0, mutation = false;
  const key = owner => owner ? `${owner.actor}:${owner.token}` : "";
  return {
    cancel() { revision++; controllers.forEach(controller => controller.abort()); controllers.clear(); },
    async request(method, plan) {
      const owner = readOwner(), original = key(owner), version = revision;
      if (!owner?.actor.startsWith("employer:") || !owner.token) throw new client.CanceledError("Employer session changed");
      if (method !== "GET" && mutation) throw Error("A plan request is already pending.");
      if (method !== "GET" && !["bronze", "silver", "platinum"].includes(plan)) throw Error("Please select an Employer plan.");
      const controller = new AbortController(); controllers.add(controller);
      if (method !== "GET") mutation = true;
      const current = () => !controller.signal.aborted && revision === version && key(readOwner()) === original;
      try {
        const { data } = await client.request({ method, url: `${baseUrl}/api/payments/employer/${method === "GET" ? "subscription" : "pay-later"}`,
          ...(method === "GET" ? {} : { data: { plan } }), signal: controller.signal,
          headers: { Authorization: `Bearer ${owner.token}` },
        });
        if (!current()) throw new client.CanceledError("Employer session changed");
        if (data?.success !== true) throw Error("The plan request could not be confirmed.");
        if (method === "GET" && (data.accountId !== owner.actor.slice("employer:".length)
          || data.subscriptionStatus?.role !== "employer" || typeof data.subscriptionStatus.paidEligible !== "boolean"
          || !["free", "bronze", "silver", "platinum"].includes(data.subscriptionStatus.effectivePlan))) throw Error("Your plan could not be confirmed.");
        return data;
      } catch (error) {
        if (!current()) throw new client.CanceledError("Employer session changed");
        throw error;
      } finally { controllers.delete(controller); if (method !== "GET") mutation = false; }
    },
  };
}
