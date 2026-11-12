import { retryAfterMs } from "./pollingCooldown.js";

// Only the server's evidence-based DTO grants UI access, never raw subscription/account flags.
export function hasTalentPublicAccess(result, now = Date.now()) {
  const status = result?.subscriptionStatus;
  return !result?.loading && !result?.error && status?.role === "talent"
    && status.paidEligible === true && status.effectivePlan === "public"
    && status.eligibility?.talentPublicProfile === true
    && Number.isFinite(Date.parse(status.expiry)) && Date.parse(status.expiry) > now;
}

const empty = { loading: true, checking: false, error: "", retryAt: 0, publicPortfolio: undefined };
const terminal = new Set(["cancelled", "expired", "past_due", "inactive", "inconsistent", "missing"]);

// One store per captured account/token. Every request and timer belongs to that session.
export function createTalentEntitlements({ owner, readOwner, fetchSubscription, events,
  now = Date.now, timers = globalThis, cooldownUntil = () => 0, onIdle = () => {} }) {
  let snapshot = empty, refs = 0, confirmations = 0, version = 0;
  let request, pending, retryTimer, deadlineTimer, expiryTimer, cycle, retryAt = 0;
  const listeners = new Set();
  const current = () => {
    const session = readOwner();
    return refs > 0 && session?.actor === owner.actor && session?.token === owner.token;
  };
  const publish = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn()); };
  const clearRetry = () => { timers.clearTimeout(retryTimer); retryTimer = undefined; };
  const stopCycle = () => {
    cycle = undefined; clearRetry(); timers.clearTimeout(deadlineTimer);
    publish({ checking: false });
  };
  const abort = () => { version++; request?.abort(); request = undefined; pending = undefined; };
  const reset = () => {
    abort(); stopCycle(); timers.clearTimeout(expiryTimer);
    publish({ ...empty, loading: false, error: "Please sign in with your Talent account to view your plan." });
  };
  const header = (headers, key) => headers?.get?.(key)
    ?? Object.entries(headers || {}).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
  const schedule = () => {
    clearRetry();
    if (!current() || !cycle) return;
    if (hasTalentPublicAccess(snapshot, now()) || terminal.has(snapshot.subscriptionStatus?.status)
      || cycle.attempts >= 7 || now() >= cycle.until) { finishCycle(); return; }
    const delay = Math.max([2000, 3000, 5000, 10000, 15000, 20000][Math.max(0, cycle.attempts - 1)],
      retryAt - now(), cooldownUntil() - now());
    if (now() + delay >= cycle.until) { finishCycle(); return; }
    retryTimer = timers.setTimeout(() => { retryTimer = undefined; read(); }, delay);
  };
  const finishCycle = () => {
    stopCycle();
    if (retryAt > now()) retryTimer = timers.setTimeout(() => publish({ retryAt: 0 }), retryAt - now());
  };
  async function read() {
    if (!current()) { reset(); return; }
    if (pending) return pending;
    clearRetry();
    const waitUntil = Math.max(retryAt, cooldownUntil());
    if (waitUntil > now()) {
      publish({ loading: false, subscriptionStatus: undefined, publicProfile: undefined, publicPortfolio: undefined,
        retryAt: waitUntil, checking: Boolean(cycle) });
      if (cycle && waitUntil < cycle.until) retryTimer = timers.setTimeout(read, waitUntil - now());
      else {
        if (cycle) stopCycle();
        retryTimer = timers.setTimeout(() => publish({ retryAt: 0 }), waitUntil - now());
      }
      return;
    }
    const controller = new AbortController(), revision = ++version;
    request = controller;
    if (cycle) cycle.attempts++;
    publish({ loading: true, error: "", retryAt: 0, checking: Boolean(cycle) });
    // Includes time spent deferred by shared HTTP cooldown interceptors.
    const timeout = timers.setTimeout(() => controller.abort(), 10000);
    const valid = () => current() && revision === version;
    pending = (async () => {
      try {
        const data = await fetchSubscription(controller.signal);
        if (!valid() || controller.signal.aborted) return;
        if (data?.success !== true || data.accountId !== owner.actor.slice("talent:".length)
          || data.subscriptionStatus?.role !== "talent" || typeof data.subscriptionStatus.paidEligible !== "boolean") {
          throw Error("Your subscription could not be confirmed.");
        }
        publish({ loading: false, error: "", subscription: data.subscription,
          subscriptionStatus: data.subscriptionStatus, publicProfile: data.publicProfile, publicPortfolio: data.publicPortfolio,
          pendingDowngrade: data.pendingDowngrade });
        timers.clearTimeout(expiryTimer);
        if (hasTalentPublicAccess(snapshot, now())) {
          expiryTimer = timers.setTimeout(() => { publish({ loading: true }); read(); },
            Math.min(2147483647, Date.parse(data.subscriptionStatus.expiry) - now()));
        }
      } catch (error) {
        if (!valid()) return;
        if (error.response?.status === 429) {
          const delay = retryAfterMs(header(error.response.headers, "Retry-After"), header(error.response.headers, "Date"), now())
            ?? retryAfterMs(header(error.response.headers, "RateLimit-Reset"), null, now()) ?? 30000;
          retryAt = Math.max(retryAt, now() + delay + 100);
        }
        publish({ loading: false, subscriptionStatus: undefined, publicProfile: undefined, publicPortfolio: undefined,
          retryAt, error: error.response?.status === 429
            ? "Please wait before checking your subscription again."
            : "Your subscription could not be confirmed. Check again before attempting another payment." });
        if ([401, 403].includes(error.response?.status)) stopCycle();
        if (!cycle && retryAt > now()) retryTimer = timers.setTimeout(() => publish({ retryAt: 0 }), retryAt - now());
      } finally {
        timers.clearTimeout(timeout);
        if (valid()) {
          pending = undefined; request = undefined;
          if (controller.signal.aborted && snapshot.loading) publish({ loading: false,
            subscriptionStatus: undefined, publicProfile: undefined, publicPortfolio: undefined, error: "Your subscription could not be confirmed. Please check again." });
          schedule();
        }
      }
    })();
    return pending;
  }
  const startCycle = () => {
    if (!current()) return;
    clearRetry(); timers.clearTimeout(deadlineTimer);
    cycle = { attempts: pending ? 1 : 0, until: now() + 60000 };
    publish({ checking: true });
    deadlineTimer = timers.setTimeout(() => {
      abort(); stopCycle(); publish({ loading: false, subscriptionStatus: undefined, publicProfile: undefined, publicPortfolio: undefined,
        error: "Confirmation is taking longer than expected. Check again before attempting another payment." });
    }, 60000);
    read();
  };
  const changed = () => { if (!current()) reset(); };
  const wake = () => {
    if (!current()) { reset(); return; }
    // A wake refreshes once; only an explicit Check again opens another retry budget.
    if (events.document?.visibilityState !== "hidden" && events.navigator?.onLine !== false) read();
  };
  const invalidated = event => {
    if (event.detail?.actor && event.detail.actor !== owner.actor) return;
    if (!current()) { reset(); return; }
    abort(); publish({ loading: true }); read();
  };
  const store = {
    get: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    refresh() {
      if (!current()) { reset(); return; }
      abort();
      if (confirmations) startCycle(); else read();
    },
    confirm() {
      confirmations++;
      if (confirmations === 1) startCycle();
      return () => {
        confirmations--;
        if (!confirmations && cycle) {
          abort(); stopCycle(); publish({ loading: false, subscriptionStatus: undefined, publicProfile: undefined, publicPortfolio: undefined });
        }
      };
    },
    retain() {
      refs++;
      if (refs === 1) {
        events.addEventListener("storage", changed);
        events.addEventListener("qnduit:polling-session-changed", changed);
        events.addEventListener("qnduit:talent-entitlements-changed", invalidated);
        for (const name of ["focus", "online", "pageshow"]) events.addEventListener(name, wake);
        events.document?.addEventListener("visibilitychange", wake);
        read();
      }
      return () => {
        refs--;
        if (!refs) {
          abort(); stopCycle(); timers.clearTimeout(expiryTimer);
          events.removeEventListener("storage", changed);
          events.removeEventListener("qnduit:polling-session-changed", changed);
          events.removeEventListener("qnduit:talent-entitlements-changed", invalidated);
          for (const name of ["focus", "online", "pageshow"]) events.removeEventListener(name, wake);
          events.document?.removeEventListener("visibilitychange", wake);
          queueMicrotask(() => { if (!refs) onIdle(store); });
        }
      };
    },
  };
  return store;
}
