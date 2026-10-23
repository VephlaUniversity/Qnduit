import { pollingRoles } from "../../../shared/pollingPolicy.js";

export function retryAfterMs(value, serverDate, now = Date.now()) {
  if (value == null || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds * 1000) ? seconds * 1000 : null;
  }
  if (!/[a-z]/i.test(text)) return null;
  const date = Date.parse(text);
  if (!Number.isFinite(date)) return null;
  const serverNow = Date.parse(serverDate);
  return Math.max(0, date - (Number.isFinite(serverNow) ? serverNow : now));
}

const header = (headers, name) => headers?.get?.(name)
  ?? Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

// One coordinator per API origin. Neither tokens nor token-derived keys are
// broadcast. Account cooldowns survive token refresh; request ownership does not.
export function createPollingCooldowns({ now = Date.now, random = Math.random, timers = globalThis, broadcast } = {}) {
  const deadlines = new Map();
  const listeners = new Set();
  const deadline = actor => Math.max(deadlines.get("poll-ip") || 0, deadlines.get(`poll-account:${actor}`) || 0);
  const receive = ({ scope, actor, until }) => {
    if (!["poll-ip", "poll-account"].includes(scope) || !Number.isFinite(until) || until <= now()) return;
    if (scope === "poll-account" && !actor) return;
    const key = scope === "poll-ip" ? scope : `${scope}:${actor}`;
    deadlines.set(key, Math.max(deadlines.get(key) || 0, until));
    listeners.forEach(listener => listener());
  };
  return {
    deadline,
    receive,
    note(response, actor) {
      if (response?.status !== 429) return;
      const scope = response.data?.scope || header(response.headers, "RateLimit-Scope");
      if (!["poll-ip", "poll-account", "general-ip"].includes(scope)) return;
      let delay = retryAfterMs(header(response.headers, "Retry-After"), header(response.headers, "Date"), now());
      if (delay === null) delay = retryAfterMs(header(response.headers, "RateLimit-Reset"), null, now());
      if (delay === null) delay = 30_000;
      // A general fallback rejection applies to this invalid/disallowed actor.
      // Other authenticated actors still have their separate polling allowance.
      const notice = { scope: scope === "general-ip" ? "poll-account" : scope, actor,
        until: now() + delay + 100 + Math.floor(random() * 400) };
      receive(notice);
      broadcast?.(notice);
    },
    wait(actor, { signal, current = () => true } = {}) {
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
          timers.clearTimeout(timer); listeners.delete(check); signal?.removeEventListener("abort", check);
        };
        const check = () => {
          timers.clearTimeout(timer);
          if (signal?.aborted || !current()) {
            cleanup(); reject(Object.assign(new Error("Polling request cancelled"), { code: "ERR_CANCELED" })); return;
          }
          const remaining = deadline(actor) - now();
          if (remaining <= 0) { cleanup(); resolve(); return; }
          timer = timers.setTimeout(check, Math.min(remaining, 2_147_483_647));
        };
        listeners.add(check); signal?.addEventListener("abort", check, { once: true }); check();
      });
    },
    sessionChanged() { listeners.forEach(listener => listener()); },
  };
}

export function installPollingRateLimits(client, { apiBaseUrl, readSession, events = window, channelFactory = name => new BroadcastChannel(name) }) {
  const origin = new URL(apiBaseUrl, events.location.href).origin;
  let channel;
  const cooldown = createPollingCooldowns({ broadcast: notice => channel?.postMessage(notice) });
  if (typeof BroadcastChannel !== "undefined") {
    channel = channelFactory(`qnduit:polling-cooldown:${origin}`);
    channel.onmessage = event => cooldown.receive(event.data || {});
  }
  const requests = new Set();
  const isCurrent = context => {
    const session = readSession();
    return session?.actor === context.actor && session?.token === context.token;
  };
  const sessionChanged = () => {
    for (const context of requests) if (!isCurrent(context)) context.controller.abort();
    cooldown.sessionChanged();
  };
  events.addEventListener("storage", sessionChanged);
  events.addEventListener("qnduit:polling-session-changed", sessionChanged);
  const release = context => {
    if (!context) return;
    requests.delete(context); context.signal?.removeEventListener("abort", context.abort);
  };
  const requestId = client.interceptors.request.use(async config => {
    const url = new URL(config.url, config.baseURL || apiBaseUrl || events.location.href);
    if (url.origin !== origin || !pollingRoles(config.method || "get", url.pathname)) return config;
    const session = readSession();
    const bearer = config.headers?.get?.("Authorization") || config.headers?.Authorization;
    if (!session?.actor || !session.token || bearer !== `Bearer ${session.token}`) {
      throw new client.CanceledError("Polling session changed");
    }
    const context = { ...session, controller: new AbortController(), signal: config.signal };
    context.abort = () => context.controller.abort();
    context.signal?.addEventListener("abort", context.abort, { once: true });
    if (context.signal?.aborted) context.abort();
    requests.add(context); config.__pollingContext = context; config.signal = context.controller.signal;
    try {
      // This defers only an unsent polling request. Failed requests and user
      // mutations are never replayed. Focus/manual refresh use the same gate.
      await cooldown.wait(context.actor, { signal: config.signal, current: () => isCurrent(context) });
      if (!isCurrent(context)) throw new client.CanceledError("Polling session changed");
      return config;
    } catch (error) { release(context); throw new client.CanceledError(error.message); }
  });
  const responseId = client.interceptors.response.use(response => {
    const context = response.config?.__pollingContext;
    release(context);
    if (context && !isCurrent(context)) throw new client.CanceledError("Polling session changed");
    return response;
  }, error => {
    const context = error.config?.__pollingContext;
    if (context) cooldown.note(error.response, context.actor);
    release(context);
    return Promise.reject(error);
  });
  return () => {
    client.interceptors.request.eject(requestId); client.interceptors.response.eject(responseId);
    events.removeEventListener("storage", sessionChanged);
    events.removeEventListener("qnduit:polling-session-changed", sessionChanged);
    for (const context of requests) { context.controller.abort(); release(context); }
    channel?.close();
  };
}
