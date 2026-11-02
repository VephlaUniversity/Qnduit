import { jobApplicationConfiguration } from "./jobApplicationConfiguration.js";

const pendingKey = "qnduit:external-apply-continuation";
const intentKey = "qnduit:external-apply:";
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export function externalApplyPath(job, destination) {
  const source = job.source ?? "employer";
  const id = job._id || job.id;
  if (!["employer", "admin"].includes(source) || !/^[a-f\d]{24}$/i.test(id || "")) return "";
  // Keep the expected URL in the fragment, away from server GET/access logs.
  return `/external-apply/${source}/${id}#destination=${encodeURIComponent(destination)}`;
}

export function readExternalApplyTarget(to) {
  if (typeof to !== "string") return null;
  const match = /^\/external-apply\/(employer|admin)\/([a-f\d]{24})#(.+)$/i.exec(to);
  if (!match || !["employer", "admin"].includes(match[1])) return null;
  const params = new URLSearchParams(match[3]);
  const values = params.getAll("destination");
  if (values.length !== 1 || [...params.keys()].some(key => key !== "destination")) return null;
  const expectedDestination = values[0];
  // The recording server remains authoritative; never navigate using this input.
  const checked = jobApplicationConfiguration({ applicationType: "external", applicationUrl: expectedDestination });
  if (Object.keys(checked.errors).length || checked.configuration.applicationUrl !== expectedDestination) return null;
  return { jobId: match[2].toLowerCase(), source: match[1], expectedDestination };
}

export function prepareExternalApplyIntent(to, continuationId) {
  const payload = readExternalApplyTarget(to);
  if (!payload) throw new Error("Invalid external application link. Reopen it from the job.");
  const previous = window.history.state?.externalApplyIntent;
  const id = continuationId || (previous?.to === to ? previous.intentId : null) || crypto.randomUUID();
  if (!uuid.test(id)) throw new Error("Invalid application intent. Reopen it from the job.");
  const saved = sessionStorage.getItem(intentKey + id);
  const intent = saved ? JSON.parse(saved) : { ...payload, intentId: id, actor: null };
  if (intent.jobId !== payload.jobId || intent.source !== payload.source || intent.expectedDestination !== payload.expectedDestination || intent.intentId !== id) {
    throw new Error("This application intent belongs to a different link. Reopen it from the job.");
  }
  sessionStorage.setItem(intentKey + id, JSON.stringify(intent));
  window.history.replaceState({ ...window.history.state, externalApplyIntent: { to, intentId: id } }, "");
  return intent;
}

export function bindExternalApplyActor(intent, actor) {
  const saved = JSON.parse(sessionStorage.getItem(intentKey + intent.intentId));
  if (!saved || saved.actor && saved.actor !== actor) {
    throw Object.assign(new Error("Your account changed. Reopen Apply from the job using the intended Talent account."), { code: "EXTERNAL_APPLY_ACCOUNT_CHANGED" });
  }
  const bound = { ...saved, actor };
  sessionStorage.setItem(intentKey + intent.intentId, JSON.stringify(bound));
  return bound;
}

export function rememberExternalApplyContinuation(to, intentId) {
  sessionStorage.setItem(pendingKey, JSON.stringify({ to, intentId }));
}

export function externalApplyContinuation(state) {
  let value = state?.externalApplyContinuation;
  if (!value) {
    try { value = JSON.parse(sessionStorage.getItem(pendingKey)); } catch { return null; }
  }
  if (!value || !uuid.test(value.intentId || "") || !readExternalApplyTarget(value.to)) return null;
  // A continuation must describe the intent prepared in this tab. A syntactically
  // valid launch URL supplied through router state alone cannot replace it.
  try {
    const saved = JSON.parse(sessionStorage.getItem(intentKey + value.intentId));
    const target = readExternalApplyTarget(value.to);
    if (!saved || saved.intentId !== value.intentId || saved.jobId !== target.jobId ||
      saved.source !== target.source || saved.expectedDestination !== target.expectedDestination) return null;
  } catch { return null; }
  return value;
}

export function clearExternalApplyContinuation(intentId) {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey));
    if (value?.intentId === intentId) sessionStorage.removeItem(pendingKey);
  } catch { /* No continuation to clear. */ }
}
