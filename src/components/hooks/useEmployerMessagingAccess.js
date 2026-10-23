import { useEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { startMessagePolling } from "../utils/messagePolling";

const stores = new Map();
const allowed = { status: "allowed" };
const loading = { status: "loading" };
const inactive = { get: () => loading, subscribe: () => () => {}, retain: () => () => {}, refresh() {} };
const talentAccess = { ...inactive, get: () => allowed };
const denialCode = "EMPLOYER_MESSAGING_DENIED";

function createAccessStore(token, key) {
  let snapshot = loading, refs = 0, loop, interceptor;
  const listeners = new Set();
  const publish = status => {
    snapshot = { status };
    listeners.forEach(listener => listener());
  };
  const store = {
    get: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refresh: () => loop?.wake(),
    retain() {
      refs++;
      if (!loop) {
        interceptor = axios.interceptors.response.use(response => response, error => {
          if (error.config?.url?.startsWith(`${API_BASE_URL}/api/messages`) &&
            error.config?.headers?.Authorization === `Bearer ${token}` &&
            error.response?.status === 403 && error.response?.data?.code === denialCode) {
            loop?.cancel();
            publish("restricted");
          }
          return Promise.reject(error);
        });
        loop = startMessagePolling({
          intervalMs: 30000, maxDelayMs: 120000,
          async run(signal) {
            if (localStorage.getItem("token") !== token) { publish("loading"); return false; }
            const { data } = await axios.get(`${API_BASE_URL}/api/employers/messaging-access`, {
              signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
            });
            if (signal.aborted || localStorage.getItem("token") !== token) return false;
            if (typeof data?.allowed !== "boolean") throw new Error("Invalid access response");
            publish(data.allowed ? "allowed" : "restricted");
          },
          onSuccess() {},
          onError: error => { if (error?.response?.status !== 429) publish("error"); },
          onUnauthorized: () => publish("error"),
        });
        loop.wake();
      }
      return () => {
        refs--;
        queueMicrotask(() => {
          if (!refs) {
            loop?.stop(); loop = null;
            axios.interceptors.response.eject(interceptor);
            snapshot = loading;
            if (stores.get(key) === store) stores.delete(key);
          }
        });
      };
    },
  };
  return store;
}

export function useEmployerMessagingAccess() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const actor = user ? `${user.userType}:${user._id || user.id}` : "";
  const store = useMemo(() => {
    if (user?.userType === "talent") return talentAccess;
    if (user?.userType !== "employer" || !token || !actor) return inactive;
    const key = `${actor}:${token}`;
    if (!stores.has(key)) stores.set(key, createAccessStore(token, key));
    return stores.get(key);
  }, [actor, token, user?.userType]);
  useEffect(() => store.retain(), [store]);
  const state = useSyncExternalStore(store.subscribe, store.get, inactive.get);
  return { ...state, refresh: store.refresh };
}
