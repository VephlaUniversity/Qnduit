import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions, requestSafety } from "../utils/requestSafety";
import { createAdminResetSession, validResetTarget } from "../utils/adminPasswordReset";
import { useAuth } from "./useAuth";

const readOwner = () => browserSessions().find(row => row.actor.startsWith("admin:"));
export function useAdminPasswordReset() {
  const { adminUser } = useAuth();
  const [subject, setSubject] = useState(null);
  const [status, setStatus] = useState("confirm");
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now);
  const owner = useRef(null);
  const [session] = useState(() => createAdminResetSession({ client: axios, baseUrl: API_BASE_URL, readOwner, safety: requestSafety, onPending: setPending }));
  const safety = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const until = Math.max(safety.authUntil, safety.generalUntil);
  const seconds = Math.max(0, Math.ceil((until - Math.max(now, Date.now())) / 1000));
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= until) clearInterval(timer); }, 500);
    return () => clearInterval(timer);
  }, [until]);
  useEffect(() => {
    if (!subject) return;
    const changed = () => {
      if (owner.current !== JSON.stringify(readOwner())) { session.cancel(); setSubject(null); }
    };
    changed();
    window.addEventListener("storage", changed);
    window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { session.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [subject, adminUser?.id, adminUser?._id, session]);
  return {
    subject, status, pending, seconds,
    disabled: pending || seconds > 0,
    open(target) {
      session.cancel(); owner.current = JSON.stringify(readOwner());
      setStatus(validResetTarget(target) ? "confirm" : "invalid"); setSubject(target);
    },
    close() { session.cancel(); setSubject(null); },
    confirm() {
      if (!subject || owner.current !== JSON.stringify(readOwner())) return;
      return session.send(subject, setStatus);
    },
  };
}
