import { useEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";

const stores = new Map();
const empty = { image: "", fullName: "", key: "" };
const inactive = { get: () => empty, subscribe: () => () => {}, retain: () => () => {}, refresh() {} };
function createStore(key, role, token, id) {
  const identity = `${role}:${id}`;
  let snapshot = { image: "", fullName: "", key: identity }, refs = 0, request, invalidated = false;
  const listeners = new Set();
  const publish = (image, fullName = "") => { snapshot = { image, fullName, key: identity }; listeners.forEach(listener => listener()); };
  const invalidate = event => {
    if (event.key !== null && event.key !== "token" && event.key !== "user") return;
    if (event.key === "token" && event.newValue === token) return;
    if (event.key === "user" && event.newValue) {
      try { const stored = JSON.parse(event.newValue); if (`${stored.userType}:${stored.id || stored._id}` === identity) return; } catch { /* Invalid stored identity is treated as logout. */ }
    }
    invalidated = true; request?.abort(); publish("");
  };
  const store = {
    get: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async refresh() {
      if (invalidated || !refs || localStorage.getItem("token") !== token) return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/${role === "employer" ? "employers" : "talents"}/profile`, {
          signal: controller.signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
        });
        if (controller.signal.aborted || !refs || localStorage.getItem("token") !== token) return;
        const image = role === "employer" ? data.profile?.logo : data.profile?.avatar;
        // Reuse the dashboard's loaded profile; fullName is Talent's public
        // display name. Never substitute private login/contact identity fields.
        const fullName = role === "talent" && typeof data.profile?.fullName === "string" ? data.profile.fullName : "";
        publish(typeof image === "string" ? image : "", fullName);
      } catch (error) {
        // A failed avatar refresh must not turn a successful profile save into a failure.
        if (!controller.signal.aborted && refs && error.response?.status === 401) publish("");
      }
    },
    retain() {
      refs++;
      if (refs === 1) { window.addEventListener("storage", invalidate); store.refresh(); }
      return () => {
        refs--;
        queueMicrotask(() => {
          if (!refs) { request?.abort(); window.removeEventListener("storage", invalidate); if (stores.get(key) === store) stores.delete(key); }
        });
      };
    },
  };
  return store;
}
export function useOwnerAvatar() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const role = user?.userType;
  const id = user?.id || user?._id;
  const store = useMemo(() => {
    if (!token || !id || !["employer", "talent"].includes(role)) return inactive;
    const key = `${role}:${id}:${token}`;
    if (!stores.has(key)) stores.set(key, createStore(key, role, token, id));
    return stores.get(key);
  }, [id, role, token]);
  useEffect(() => store.retain(), [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, inactive.get);
  return useMemo(() => ({ ...snapshot, refresh: store.refresh }), [snapshot, store]);
}
