import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions, requestSafety } from "../utils/requestSafety";
import { createAdminSubscriptionActionSession } from "../utils/adminSubscriptionAction";

const readOwner = () => browserSessions().find(row => row.actor.startsWith("admin:"));
export function useAdminSubscriptionAction(action, onSaved) {
  const [target, setTarget] = useState(null), [result, setResult] = useState({ status: "loading" });
  const owner = useRef(null), [clock, setClock] = useState(Date.now);
  const [session] = useState(() => createAdminSubscriptionActionSession({ client: axios, baseUrl: API_BASE_URL, readOwner, action }));
  const safety = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const until = Math.max(result.until || 0, safety.generalUntil);
  useEffect(() => {
    if (!target) return;
    const changed = () => { if (owner.current !== JSON.stringify(readOwner())) { session.cancel(); setTarget(null); } };
    changed(); window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { session.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [target, session]);
  useEffect(() => {
    if (!target || until <= Date.now()) return;
    const timer = setInterval(() => setClock(Date.now()), 500); return () => clearInterval(timer);
  }, [target, until]);
  return {
    target, result, seconds: Math.max(0, Math.ceil((until - Math.max(clock, Date.now())) / 1000)),
    open(row, trigger) {
      session.cancel(); owner.current = JSON.stringify(readOwner());
      const selection = { type: row.type, accountId: row.accountId, trigger };
      setTarget(selection); session.load(selection, setResult);
    },
    selectPlan(toPlan) {
      if (result.status === "ready" && !result.pending && result.lowerPlans?.includes(toPlan)) setResult({ ...result, toPlan });
    },
    close() { session.cancel(); setTarget(null); },
    refresh() { if (target) session.load(target, setResult); },
    send() { if (target && until <= Date.now()) session.send(target, result, setResult, onSaved); },
  };
}
