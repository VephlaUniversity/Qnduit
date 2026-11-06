import { useEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { browserSessions, requestSafety } from "../utils/requestSafety";
import { createTalentEntitlements } from "../utils/talentEntitlements";

const stores = new Map();
const empty = { loading: false, error: "Please sign in with your Talent account to view your plan." };
const inactive = { get: () => empty, subscribe: () => () => {}, retain: () => () => {}, confirm: () => () => {}, refresh() {} };

export const talentPaymentToken = () => browserSessions().find(owner => owner.actor.startsWith("talent:"))?.token;

export function useTalentSubscription(enabled = true, confirm = false) {
  const { user } = useAuth();
  const actor = enabled && user?.userType === "talent" ? `talent:${user.id || user._id}` : null;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const store = useMemo(() => {
    if (!actor || !token) return inactive;
    const key = `${actor}:${token}`;
    if (!stores.has(key)) stores.set(key, createTalentEntitlements({
      owner: { actor, token }, readOwner: () => browserSessions().find(owner => owner.actor === actor), events: window,
      cooldownUntil: () => requestSafety.getSnapshot().generalUntil,
      fetchSubscription: signal => axios.get(`${API_BASE_URL}/api/payments/subscription`, {
        signal, timeout: 10000, qnduitBoundedRead: true, headers: { Authorization: `Bearer ${token}` },
      }).then(response => response.data),
      onIdle: current => { if (stores.get(key) === current) stores.delete(key); },
    }));
    return stores.get(key);
  }, [actor, token]);
  useEffect(() => store.retain(), [store]);
  useEffect(() => confirm ? store.confirm() : undefined, [store, confirm]);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, inactive.get);
  return useMemo(() => ({ ...snapshot, refresh: store.refresh }), [snapshot, store]);
}
