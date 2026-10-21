import { useEmployerMessagingAccess } from "./useEmployerMessagingAccess";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { startMessagePolling } from "../utils/messagePolling";

const stores = new Map();
const empty = { total: null, counts: {}, enabled: null, error: "", expired: false, presence: {} };
const inactive = { subscribe: () => () => {}, get: () => empty, retain: () => () => {}, register: () => ({ stop() {}, wake() {}, cancel() {} }), wake() {}, watchPresence() {} };
function createStore(token, key, actor) {
  let snapshot = empty, refs = 0, loop, runner, started = false, nextHeartbeat = 0, targets = [], targetVersion = 0, expiryTimer;
  const listeners = new Set();
  const publish = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const prunePresence = () => {
    clearTimeout(expiryTimer);
    const now = performance.now();
    const entries = Object.entries(snapshot.presence).filter(([, row]) => row.validUntil > now);
    if (entries.length !== Object.keys(snapshot.presence).length) publish({ presence: Object.fromEntries(entries) });
    if (entries.length) expiryTimer = setTimeout(prunePresence, Math.max(0, Math.min(...entries.map(([, row]) => row.validUntil)) - now) + 1);
  };
  const expire = () => { loop?.stop(); clearTimeout(expiryTimer); publish({ ...empty, expired: true, error: "Session unavailable." }); runner?.onUnauthorized(); };
  const storage = event => {
    if (event.key === "token" && event.newValue === token) return;
    if (event.key === "user" && event.newValue) {
      try { const stored = JSON.parse(event.newValue); if (`${stored.userType}:${stored._id || stored.id || stored.email}` === actor) return; } catch { /* Invalid session data expires the coordinator. */ }
    }
    if (event.key === null || event.key === "token" || event.key === "user") expire();
  };
  const store = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get: () => snapshot,
    wake: () => loop?.wake(),
    watchPresence(recipients) {
      const unique = new Map();
      for (const row of recipients) {
        if (row && /^[a-f\d]{24}$/i.test(row.id || "") && ["Talent", "Employer"].includes(row.model)) unique.set(`${row.model}:${row.id.toLowerCase()}`, { id: row.id.toLowerCase(), model: row.model });
        if (unique.size === 100) break;
      }
      const next = [...unique.values()].sort((a, b) => `${a.model}:${a.id}`.localeCompare(`${b.model}:${b.id}`));
      if (JSON.stringify(next) === JSON.stringify(targets)) return;
      targets = next; targetVersion++;
      publish({ presence: Object.fromEntries(Object.entries(snapshot.presence).filter(([key]) => unique.has(key))) });
      prunePresence();
    },
    retain() {
      refs++;
      if (!loop) {
        window.addEventListener("storage", storage);
        window.addEventListener("focus", prunePresence);
        document.addEventListener("visibilitychange", prunePresence);
        loop = startMessagePolling({
          async run(signal) {
            if (localStorage.getItem("token") !== token) { expire(); return false; }
            const runMessages = started;
            started = true;
            let failure;
            const post = async (path, body) => (await axios.post(`${API_BASE_URL}/api/messages/${path}`, body, {
              signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
            })).data;
            if (performance.now() >= nextHeartbeat) {
              try {
                const data = await post("heartbeat", {});
                if (signal.aborted) return false;
                if (!data.success || data.heartbeatAfterMs !== 20000) throw new Error("Invalid heartbeat");
                nextHeartbeat = performance.now() + 20000;
              } catch (error) { if (signal.aborted) return false; failure = error; }
            }
            if (failure?.response?.status === 401) throw failure;
            try {
              let before, total, enabled, counts = {};
              const cursors = new Set();
              do {
                const { data } = await axios.get(`${API_BASE_URL}/api/messages/unread`, {
                  headers: { Authorization: `Bearer ${token}` }, params: { limit: 100, ...(before ? { before } : {}) }, signal, timeout: 15000,
                });
                if (signal.aborted) return false;
                if (typeof data.enabled !== "boolean" || !Array.isArray(data.results) || data.enabled && (!Number.isSafeInteger(data.total) || data.total < 0)) throw new Error("Invalid unread summary");
                total = data.total; enabled = data.enabled;
                for (const row of data.results) counts[`${row.role}:${row.id}`] = row.unread;
                before = data.pagination?.hasMore ? data.pagination.nextCursor : null;
                if (before && (typeof before !== "string" || cursors.has(before))) throw new Error("Invalid unread cursor");
                if (data.pagination?.hasMore && !before) throw new Error("Missing unread cursor");
                if (before) cursors.add(before);
              } while (before);
              publish({ total: enabled ? total : null, enabled, counts, error: "" });
            } catch (error) { if (signal.aborted) return false; failure = error; publish({ error: "Unread counts could not be refreshed." }); }
            if (failure?.response?.status === 401) throw failure;
            try { if (runMessages) await runner?.run(signal); } catch (error) { failure = error; }
            if (failure?.response?.status === 401) throw failure;
            if (targets.length) {
              const version = targetVersion, requested = targets, began = performance.now();
              try {
                const data = await post("presence", { recipients: requested });
                if (signal.aborted) return false;
                if (version === targetVersion) {
                  if (!data.success || !Array.isArray(data.results) || data.results.length !== requested.length) throw new Error("Invalid presence");
                  const now = performance.now(), allowed = new Set(requested.map(row => `${row.model}:${row.id}`)), seen = new Set(), presence = {};
                  for (const row of data.results) {
                    const key = `${row.model}:${row.id}`;
                    if (!allowed.has(key) || seen.has(key) || !["online", "offline", "unknown"].includes(row.status)
                      || !Number.isFinite(row.validForMs) || row.validForMs < 0 || row.validForMs > 10000) throw new Error("Invalid presence");
                    seen.add(key);
                    const duration = row.validForMs - (now - began);
                    if (row.status !== "unknown" && duration > 0) presence[key] = { status: row.status, validUntil: now + duration };
                  }
                  publish({ presence }); prunePresence();
                }
              } catch (error) {
                if (signal.aborted) return false;
                if (version === targetVersion) { clearTimeout(expiryTimer); publish({ presence: {} }); }
                failure = error;
              }
            }
            if (failure) throw failure;
          },
          onSuccess: () => runner?.onSuccess(),
          onError: () => runner?.onError(),
          onUnauthorized: expire,
        });
        loop.wake();
      }
      return () => {
        refs--;
        if (!refs && actor.startsWith("employer:")) { loop?.stop(); loop = null; clearTimeout(expiryTimer); snapshot = empty; }
        queueMicrotask(() => {
          if (refs === 0) { loop?.stop(); loop = null; window.removeEventListener("storage", storage); window.removeEventListener("focus", prunePresence); document.removeEventListener("visibilitychange", prunePresence); clearTimeout(expiryTimer); if (stores.get(key) === store) stores.delete(key); }
        });
      };
    },
    register(callbacks) {
      runner = callbacks;
      return { wake: () => loop?.wake(), cancel: () => loop?.cancel(), stop() { if (runner === callbacks) { runner = null; loop?.cancel(); } } };
    },
  };
  return store;
}
export function useMessagingCoordinator() {
  const { user } = useAuth();
  const access = useEmployerMessagingAccess();
  const token = localStorage.getItem("token");
  const actor = user ? `${user.userType}:${user._id || user.id || user.email}` : "";
  const store = useMemo(() => {
    if (!actor || !token || access.status !== "allowed") return inactive;
    const key = `${actor}:${token}`;
    if (!stores.has(key)) stores.set(key, createStore(token, key, actor));
    return stores.get(key);
  }, [actor, token, access.status]);
  useEffect(() => store.retain(), [store]);
  const state = useSyncExternalStore(store.subscribe, store.get, inactive.get);
  return useMemo(() => ({ ...state, register: store.register, wake: store.wake, watchPresence: store.watchPresence }), [state, store]);
}
