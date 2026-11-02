import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration";
import {
  prepareExternalApplyIntent, bindExternalApplyActor, rememberExternalApplyContinuation,
  clearExternalApplyContinuation,
} from "../utils/externalApplicationLaunch";

// Share only in-flight work across StrictMode effects. Retries use the same
// persisted intent and the server's idempotency protection, never a new UUID.
const pendingRequests = new Map();
function record(intent, token) {
  const key = `${intent.actor}:${intent.intentId}:${token}`;
  if (!pendingRequests.has(key)) {
    const { jobId, source, expectedDestination, intentId } = intent;
    const promise = axios.post(`${API_BASE_URL}/api/applications/external-activities`,
      { jobId, source, expectedDestination, intentId },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });
    pendingRequests.set(key, promise);
    promise.finally(() => pendingRequests.delete(key)).catch(() => {});
  }
  return pendingRequests.get(key);
}

export default function ExternalApplicationLaunch() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const to = location.pathname + location.search + location.hash;
  const [prepared] = useState(() => {
    try { return { intent: prepareExternalApplyIntent(to, location.state?.externalApplyIntentId) }; }
    catch { return { error: "Unable to prepare this application link. Allow tab storage and reopen Apply from the job." }; }
  });
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const actor = user && `${user.userType}:${user.id || user._id}`;
  const intent = prepared.intent;

  useEffect(() => {
    if (!intent || isLoading) return;
    if (!user) {
      rememberExternalApplyContinuation(to, intent.intentId);
      return;
    }
    if (user.userType !== "talent") return;
    let active = true;
    async function launch() {
      try {
        const bound = bindExternalApplyActor(intent, actor);
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        // Preserve continuation even if global session handling redirects on 401.
        rememberExternalApplyContinuation(to, intent.intentId);
        const { data } = await record(bound, token);
        if (!active) return;
        const activity = data?.activity;
        const checked = jobApplicationConfiguration({}, { applicationType: "external", applicationUrl: activity?.destinationUrl });
        if (!data.success || activity?.kind !== "external" || activity.intentId !== intent.intentId ||
          activity.talentId !== String(user.id || user._id) || activity.jobId !== intent.jobId || activity.source !== intent.source ||
          activity.destinationUrl !== intent.expectedDestination || Object.keys(checked.errors).length ||
          checked.configuration.applicationUrl !== activity.destinationUrl) throw new Error("Invalid activity acknowledgement");
        clearExternalApplyContinuation(intent.intentId);
        window.opener = null;
        window.location.replace(activity.destinationUrl);
      } catch (error) {
        if (!active) return;
        const status = error.response?.status;
        if (status !== 401) clearExternalApplyContinuation(intent.intentId);
        const code = error.response?.data?.code;
        setResult({ actor, status, stale: code === "EXTERNAL_ACTIVITY_DESTINATION_CHANGED" || code === "EXTERNAL_ACTIVITY_INTENT_CONFLICT" || status === 404,
          accountChanged: error.code === "EXTERNAL_APPLY_ACCOUNT_CHANGED" });
      }
    }
    launch();
    return () => { active = false; };
  }, [intent, to, isLoading, actor, user, attempt]);

  const current = result?.actor === actor ? result : null;
  const needsSignIn = !isLoading && (!user || current?.status === 401);
  const wrongRole = user && user.userType !== "talent";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section aria-labelledby="external-apply-heading" className="w-full break-words rounded-2xl border border-white/10 bg-[#1A1A1E] p-6 md:p-8">
        <h1 id="external-apply-heading" className="text-2xl font-semibold">External Application</h1>
        {prepared.error ? <p role="alert" className="mt-4 text-gray-300">{prepared.error}</p>
          : needsSignIn ? <>
            <p className="mt-4 text-gray-300">Sign in with a Talent account to record this activity and continue.</p>
            <Link to="/signin" state={{ externalApplyContinuation: { to, intentId: intent.intentId } }}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700">Sign in to continue</Link>
          </> : wrongRole ? <p role="alert" className="mt-4 text-gray-300">A Talent account is required. Sign out and reopen Apply using your Talent account.</p>
            : current?.stale || current?.accountChanged ? <p role="alert" className="mt-4 text-gray-300">This link or account has changed, or the job is unavailable. Refresh the original job and reopen Apply. This tab has not opened the external site.</p>
              : current ? <div role="alert">
                <p className="mt-4 text-gray-300">We couldn’t confirm your application activity. The external site has not been opened. Retry to continue safely.</p>
                <button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1); }}
                  className="mt-5 min-h-[44px] rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700">Retry</button>
              </div> : <p role="status" className="mt-4 text-gray-300">{isLoading ? "Checking your session…" : "Recording activity before opening the external site…"}</p>}
        <p className="mt-6 text-sm text-gray-400">This records an external Apply click. It does not confirm completion of an application on the external site.</p>
      </section>
    </main>
  );
}
