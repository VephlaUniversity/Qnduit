import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";

export const talentPaymentToken = () =>
  localStorage.getItem("token") || localStorage.getItem("authToken");

export const hasCurrentPublicSubscription = (subscription) =>
  subscription?.plan === "public" &&
  ["active", "past_due"].includes(subscription.status) &&
  Number.isFinite(Date.parse(subscription.currentPeriodEnd)) &&
  Date.parse(subscription.currentPeriodEnd) > Date.now();

export function useTalentSubscription(enabled = true) {
  const token = talentPaymentToken();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ token: null, loading: true });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let current = true;
    setResult({ token, loading: true });
    if (!token) {
      setResult({ token, loading: false, error: "Please sign in to view your plan." });
      return () => { current = false; controller.abort(); };
    }
    axios.get(`${API_BASE_URL}/api/payments/subscription`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (current) setResult({ token, loading: false, subscription: data?.subscription || null });
    }).catch(error => {
      if (current) setResult({ token, loading: false,
        error: friendlyError(error, "We couldn't load your plan. Please try again.") });
    });
    return () => { current = false; controller.abort(); };
  }, [enabled, token, revision]);
  const state = result.token === token ? result : { loading: true };
  return { ...state, refresh: () => setRevision(value => value + 1) };
}
