import { useEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { startMessagePolling } from "../utils/messagePolling";

const stores = new Map();
const empty = { total: null, counts: {}, enabled: null, error: "", expired: false };
const inactive = { subscribe: () => () => {}, get: () => empty, retain: () => () => {}, register: () => ({ stop() {}, wake() {}, cancel() {} }), wake() {} };
function createStore(token, key, actor) {
  let snapshot = empty, refs = 0, loop, runner, started = false;
  const listeners = new Set();
  const publish = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const expire = () => { loop?.stop(); publish({ ...empty, expired: true, error: "Session unavailable." }); runner?.onUnauthorized(); };
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
    retain() {
      refs++;
      if (!loop) {
        window.addEventListener("storage", storage);
        loop = startMessagePolling({
          async run(signal) {
            if (localStorage.getItem("token") !== token) { expire(); return false; }
            const runMessages = started;
            started = true;
            let failure;
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
        queueMicrotask(() => {
          if (refs === 0) { loop?.stop(); loop = null; window.removeEventListener("storage", storage); if (stores.get(key) === store) stores.delete(key); }
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
  const token = localStorage.getItem("token");
  const actor = user ? `${user.userType}:${user._id || user.id || user.email}` : "";
  const store = useMemo(() => {
    if (!actor || !token) return inactive;
    const key = `${actor}:${token}`;
    if (!stores.has(key)) stores.set(key, createStore(token, key, actor));
    return stores.get(key);
  }, [actor, token]);
  useEffect(() => store.retain(), [store]);
  const state = useSyncExternalStore(store.subscribe, store.get, inactive.get);
  return useMemo(() => ({ ...state, register: store.register, wake: store.wake }), [state, store]);
}
