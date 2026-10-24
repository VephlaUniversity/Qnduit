import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions, requestSafety } from "../utils/requestSafety";
import { createAdminDeleteSession } from "../utils/adminDeleteUser";
import { useAuth } from "./useAuth";
const readOwner = () => browserSessions().find(owner => owner.actor.startsWith("admin:"));
export function useAdminDeleteUser(saved) {
  const { adminUser } = useAuth();
  const [subject, setSubject] = useState(null), [result, setResult] = useState({ status: "confirm" });
  const owner = useRef(null), [now, setNow] = useState(Date.now);
  const [session] = useState(() => createAdminDeleteSession({ client: axios, baseUrl: API_BASE_URL, readOwner }));
  const safety = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const pending = result.status === "sending", seconds = Math.max(0, Math.ceil((safety.generalUntil - now) / 1000));
  useEffect(() => {
    if (safety.generalUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer);
  }, [safety.generalUntil]);
  useEffect(() => {
    if (!subject) return;
    const changed = () => { if (owner.current !== JSON.stringify(readOwner())) { session.cancel(); setSubject(null); setResult({ status: "confirm" }); } };
    changed(); window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { session.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [subject, session, adminUser?.id, adminUser?._id]);
  return {
    subject, result, pending, seconds,
    open(target) { if (pending) return; session.cancel(); owner.current = JSON.stringify(readOwner()); setResult({ status: "confirm" }); setSubject(target); },
    close() { if (!pending) { session.cancel(); setSubject(null); } },
    confirm() { if (subject && !seconds && !pending && result.status !== "deleted" && owner.current === JSON.stringify(readOwner())) return session.send(subject, setResult, saved); },
  };
}
