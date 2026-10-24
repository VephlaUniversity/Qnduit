import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { createEmployerSubscriptionSession } from "../utils/employerSubscription";
import { friendlyError } from "../utils/userMessage";

export function useEmployerPlanSession(expectedOwner) {
  const { user } = useAuth();
  const actor = user?.userType === "employer" ? `employer:${user.id || user._id}` : null;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const allowed = expectedOwner === undefined || expectedOwner?.actor === actor && expectedOwner?.token === token;
  const session = useMemo(() => createEmployerSubscriptionSession({ client: axios, baseUrl: API_BASE_URL,
    readOwner: () => allowed ? browserSessions().find(owner => owner.actor === actor && owner.token === token) : null,
  }), [actor, token, allowed]);
  useEffect(() => () => session.cancel(), [session]);
  return { session, ownerKey: allowed && actor && token ? `${actor}:${token}` : null };
}

export function useEmployerSubscription() {
  const { session, ownerKey } = useEmployerPlanSession();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ ownerKey: null, loading: true });
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let current = true, reading = false, lastRead = 0;
    const read = async () => {
      if (reading) return;
      if (!ownerKey) { setResult({ ownerKey, loading: false, error: "Please sign in with an Employer account to view your plan." }); return; }
      reading = true; lastRead = Date.now();
      setResult(previous => ({ ...(previous.ownerKey === ownerKey ? previous : {}), ownerKey, loading: true, error: "" }));
      try {
        const data = await session.request("GET");
        if (current) setResult({ ownerKey, data, loading: false, error: "" });
      } catch (error) {
        if (current && !axios.isCancel(error)) setResult(previous => ({ ...previous, loading: false, error: friendlyError(error, "We couldn't load your plan. Please try again.") }));
      } finally { reading = false; }
    };
    const wake = () => { if (document.visibilityState !== "hidden" && navigator.onLine !== false && Date.now() - lastRead >= 5000) read(); };
    read();
    window.addEventListener("focus", wake); window.addEventListener("online", wake); document.addEventListener("visibilitychange", wake);
    return () => { current = false; session.cancel(); window.removeEventListener("focus", wake); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake); };
  }, [session, ownerKey, revision]);
  return { ...(result.ownerKey === ownerKey ? result : { loading: true }), refresh };
}
