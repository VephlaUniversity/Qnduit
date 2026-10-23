import { pollingRoles } from "../../../backend/src/config/pollingPolicy.js";
import { retryAfterMs } from "./pollingCooldown.js";

const getHeader = (headers, key) => headers?.get?.(key)
  ?? Object.entries(headers || {}).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
export const shouldRefreshBadgeFailure = error => error.response?.status !== 429;
const isAuthRequest = (method, path) => method === "POST" && /^\/api\/auth\/(login|forgot-password|reset-password\/[^/]+)\/?$/.test(path);

// Browser hints only: the server remains the authority for identity/access.
export function createRequestSafety({ now = Date.now, timers = globalThis, broadcast } = {}) {
  let state = { generalUntil: 0, authUntil: 0, suspended: [], version: 0 };
  const listeners = new Set();
  const publish = changes => {
    state = { ...state, ...changes, version: state.version + 1 };
    listeners.forEach(fn => fn());
  };
  const receive = notice => {
    if (notice?.scope === "general-ip" && Number.isFinite(notice.until) && notice.until > state.generalUntil) {
      publish({ generalUntil: notice.until });
    }
    if (notice?.scope === "auth-ip" && Number.isFinite(notice.until) && notice.until > state.authUntil) {
      publish({ authUntil: notice.until });
    }
    // Suspension hints are account scoped; never share credentials.
    if (notice?.scope === "suspended" && typeof notice.actor === "string" && !state.suspended.includes(notice.actor)) {
      publish({ suspended: [...state.suspended, notice.actor] });
    }
  };
  const api = {
    getSnapshot: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    receive,
    sessionChanged: () => publish({}),
    clearSuspension(actor) { publish({ suspended: state.suspended.filter(value => value !== actor) }); },
    note(response, actor, { auth = false } = {}) {
      let notice;
      if (response?.status === 403 && response.data?.code === "ACCOUNT_SUSPENDED" && actor) {
        notice = { scope: "suspended", actor };
      }
      const scope = (response?.data?.scope || getHeader(response?.headers, "RateLimit-Scope")) === "general-ip" ? "general-ip" : auth ? "auth-ip" : null;
      if (response?.status === 429 && scope) {
        const delay = retryAfterMs(getHeader(response.headers, "Retry-After"), getHeader(response.headers, "Date"), now())
          ?? retryAfterMs(getHeader(response.headers, "RateLimit-Reset"), null, now()) ?? 30_000;
        notice = { scope, until: now() + delay + 100 };
      }
      if (notice) { receive(notice); broadcast?.(notice); }
    },
    blocked(actor, general = true, revalidate = false, auth = false) {
      return (!revalidate && state.suspended.includes(actor)) ? "ACCOUNT_SUSPENDED"
        : general && state.generalUntil > now() ? "RATE_LIMITED"
          : auth && state.authUntil > now() ? "AUTH_RATE_LIMITED" : null;
    },
    wait(actor, { general = true, revalidate = false, signal, current = () => true } = {}) {
      return new Promise((resolve, reject) => {
        let timer;
        const clean = () => { timers.clearTimeout(timer); listeners.delete(check); signal?.removeEventListener("abort", check); };
        const check = () => {
          timers.clearTimeout(timer);
          if (signal?.aborted || !current()) { clean(); reject(Object.assign(new Error("Session changed or request cancelled"), { code: "ERR_CANCELED" })); return; }
          const reason = api.blocked(actor, general, revalidate);
          if (!reason) { clean(); resolve(); return; }
          if (reason === "RATE_LIMITED") timer = timers.setTimeout(check, Math.min(state.generalUntil - now(), 2_147_483_647));
        };
        listeners.add(check); signal?.addEventListener("abort", check, { once: true }); check();
      });
    },
  };
  return api;
}

export function installRequestSafety(client, { apiBaseUrl, readSessions, events = window, safety = createRequestSafety(), channelFactory = name => new BroadcastChannel(name) }) {
  const origin = new URL(apiBaseUrl, events.location.href).origin;
  const storageKey = `qnduit:general-ip-cooldown:${origin}`;
  const authStorageKey = `qnduit:auth-ip-cooldown:${origin}`;
  const loadDeadline = () => {
    try {
      safety.receive({ scope: "general-ip", until: Number(events.localStorage?.getItem(storageKey)) });
      safety.receive({ scope: "auth-ip", until: Number(events.localStorage?.getItem(authStorageKey)) });
    } catch { /* Storage may be unavailable. */ }
  };
  loadDeadline();
  const unsubscribe = safety.subscribe(() => {
    try {
      // A different tab may have learned a later IP deadline before its storage
      // event arrives here. Never overwrite that deadline with an older hint.
      for (const [key, until] of [[storageKey, safety.getSnapshot().generalUntil], [authStorageKey, safety.getSnapshot().authUntil]]) {
        events.localStorage?.setItem(key, String(Math.max(Number(events.localStorage?.getItem(key)) || 0, until)));
      }
    } catch { /* Memory gate remains active. */ }
  });
  let channel;
  if (typeof BroadcastChannel !== "undefined") {
    channel = channelFactory(`qnduit:request-safety:${origin}`);
    channel.onmessage = event => safety.receive(event.data);
  }
  const contexts = new Set();
  const current = context => context.actor === null || readSessions().some(row => row.actor === context.actor && row.token === context.token);
  const changed = event => {
    loadDeadline();
    if (event?.type === "storage" && [storageKey, authStorageKey].includes(event.key)) return;
    for (const context of contexts) if (!current(context)) context.controller.abort();
    safety.sessionChanged();
  };
  events.addEventListener("storage", changed);
  events.addEventListener("qnduit:polling-session-changed", changed);
  const release = context => { if (context) { contexts.delete(context); context.signal?.removeEventListener("abort", context.abort); } };
  const request = client.interceptors.request.use(async config => {
    const url = new URL(config.url, config.baseURL || apiBaseUrl);
    if (url.origin !== origin || !url.pathname.startsWith("/api/")) return config;
    const bearer = getHeader(config.headers, "Authorization");
    const session = readSessions().find(row => bearer === `Bearer ${row.token}`);
    // An old token must not escape ownership checks after account switching.
    if (bearer && !session) throw new client.CanceledError("Session changed");
    const method = (config.method || "get").toUpperCase();
    const polling = !!pollingRoles(method, url.pathname);
    const context = { actor: session?.actor || null, token: session?.token, auth: isAuthRequest(method, url.pathname), controller: new AbortController(), signal: config.signal };
    context.abort = () => context.controller.abort();
    context.signal?.addEventListener("abort", context.abort, { once: true });
    if (context.signal?.aborted) context.abort();
    config.signal = context.controller.signal; config.__requestSafety = context; contexts.add(context);
    const revalidate = config.requestSafetyRevalidate === true && method === "GET"
      && url.pathname === (context.actor?.startsWith("talent:") ? "/api/talents/profile" : "/api/employers/profile");
    try {
      const reason = safety.blocked(context.actor, !polling, revalidate, context.auth);
      // Reads wait without replacing cached data. Mutations fail locally, never queue/replay.
      if (reason && method !== "GET" && !polling) {
        const until = reason === "AUTH_RATE_LIMITED" ? safety.getSnapshot().authUntil : safety.getSnapshot().generalUntil;
        const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        const message = reason === "ACCOUNT_SUSPENDED" ? "Your account is suspended. Check account status before continuing."
          : `Too many requests. Try again in ${seconds} seconds.`;
        throw Object.assign(new Error(message), { code: reason, response: { status: reason === "ACCOUNT_SUSPENDED" ? 403 : 429,
          headers: { "Retry-After": String(seconds) }, data: { code: reason, message } } });
      }
      await safety.wait(context.actor, { general: !polling, revalidate, signal: config.signal, current: () => current(context) });
      if (!current(context)) throw new client.CanceledError("Session changed");
      return config;
    } catch (error) { release(context); if (error.code === "ERR_CANCELED") throw new client.CanceledError(error.message); throw error; }
  });
  const response = client.interceptors.response.use(value => {
    const context = value.config?.__requestSafety; release(context);
    if (context && !current(context)) throw new client.CanceledError("Session changed");
    return value;
  }, error => {
    const context = error.config?.__requestSafety;
    const value = error.response;
    // IP cooldowns apply even if the request's account has changed. Its private
    // response/feedback is still discarded below, and stale reads never retry.
    if (context && value?.status === 429) {
      safety.note(value, context.actor, { auth: context.auth });
      if ((value.data?.scope || getHeader(value.headers, "RateLimit-Scope")) === "general-ip") {
        channel?.postMessage({ scope: "general-ip", until: safety.getSnapshot().generalUntil });
      } else if (context.auth) channel?.postMessage({ scope: "auth-ip", until: safety.getSnapshot().authUntil });
    }
    if (context && current(context)) {
      if (value?.status !== 429) safety.note(value, context.actor, { auth: context.auth });
      if (value?.status === 429 && (value.data?.scope || getHeader(value.headers, "RateLimit-Scope")) === "general-ip") {
        if ((error.config.method || "get").toUpperCase() === "GET") {
          // Keep the read pending so consumers do not replace cached rows with
          // empty/error results during a known temporary IP cooldown.
          return client.request({ ...error.config, signal: context.signal }).finally(() => release(context));
        }
      }
      if (value?.status === 403 && value.data?.code === "ACCOUNT_SUSPENDED") channel?.postMessage({ scope: "suspended", actor: context.actor });
      if (value?.status === 403 && value.data?.code === "ACCOUNT_SUSPENDED") {
        for (const other of contexts) if (other !== context && other.actor === context.actor) other.controller.abort();
      }
    }
    release(context);
    return Promise.reject(context && !current(context) ? new client.CanceledError("Session changed") : error);
  });
  return () => {
    client.interceptors.request.eject(request); client.interceptors.response.eject(response);
    events.removeEventListener("storage", changed); events.removeEventListener("qnduit:polling-session-changed", changed);
    unsubscribe();
    for (const context of contexts) { context.controller.abort(); release(context); }
    channel?.close();
  };
}

export const requestSafety = createRequestSafety();
export function browserSessions() {
  return [["user", "token"], ["adminUser", "adminToken"]].flatMap(([key, tokenKey]) => {
    try {
      const user = JSON.parse(localStorage.getItem(key)), token = localStorage.getItem(tokenKey)
        || (key === "user" ? localStorage.getItem("authToken") : null);
      const id = user?._id || user?.id;
      return id && token ? [{ actor: `${user.userType}:${id}`, token }] : [];
    } catch { return []; }
  });
}
