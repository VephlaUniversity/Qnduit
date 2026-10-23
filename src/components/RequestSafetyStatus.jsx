import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "./utils/api";
import { browserSessions, requestSafety } from "./utils/requestSafety";

export function RequestSafetyStatus() {
  const state = useSyncExternalStore(requestSafety.subscribe, requestSafety.getSnapshot);
  const { pathname } = useLocation();
  const [now, setNow] = useState(Date.now);
  const [checkingActor, setChecking] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const session = browserSessions().find(row => pathname.startsWith("/admin") ? row.actor.startsWith("admin:") : !row.actor.startsWith("admin:"));
  const suspended = session && state.suspended.includes(session.actor);
  const checking = checkingActor === session?.actor;
  const seconds = Math.max(0, Math.ceil((state.generalUntil - now) / 1000));
  useEffect(() => {
    if (state.generalUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [state.generalUntil]);
  if (!suspended && !seconds) return null;
  const revalidate = async () => {
    setChecking(session.actor); setFeedback(null);
    try {
      await axios.get(`${API_BASE_URL}/api/${session.actor.startsWith("talent:") ? "talents" : "employers"}/profile`, {
        requestSafetyRevalidate: true, headers: { Authorization: `Bearer ${session.token}` },
      });
      if (browserSessions().some(row => row.actor === session.actor && row.token === session.token)) {
        requestSafety.clearSuspension(session.actor);
        setFeedback({ actor: session.actor, message: "Account access confirmed." });
      }
    } catch (error) {
      if (!axios.isCancel(error)) setFeedback({ actor: session.actor, message: error.response?.data?.message || "Account status is unavailable. Try again later." });
    } finally { setChecking(actor => actor === session.actor ? null : actor); }
  };
  return <aside role="status" aria-live="polite" className="sticky top-0 z-[100] border border-amber-500 bg-slate-950 p-4 text-white">
    {suspended && <p>Your account is suspended. Automatic requests are paused. This is account status, separate from your verification badge. Contact support, then check account status.</p>}
    {!!seconds && <p>Requests from this connection are temporarily limited. Try actions again in {seconds} seconds. Automatic reads will wait. Cached information may be out of date; unavailable data does not mean there are no results.</p>}
    {suspended && <button type="button" disabled={checking || seconds > 0} onClick={revalidate} className="mt-2 rounded border p-2 disabled:opacity-50">{checking ? "Checking…" : "Check account status"}</button>}
    {feedback?.actor === session?.actor && <p>{feedback?.message}</p>}
  </aside>;
}
