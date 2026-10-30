import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { employerPlanName } from "../utils/employerSubscription";
import { employerSubscriptionDate } from "../utils/employerSubscriptionDate";
import { subscriptionStatusLabel } from "../utils/subscriptionDates";

export function AdminEmployerPlanRequestDialog({ flow }) {
  const { target, result, seconds } = flow;
  const trigger = useRef(null), heading = useRef(null);
  useLayoutEffect(() => { if (target?.trigger) trigger.current = target.trigger; }, [target]);
  const subscription = result.subscription, sending = result.status === "sending", applied = result.applied || result.latestAction;
  const canSubmit = ["ready", "retry", "unconfirmed"].includes(result.status) && !seconds && result.allowedPlans?.includes(result.toPlan);
  return <Dialog open={!!target} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] p-5 text-white sm:p-6"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Downgrade Employer?</DialogTitle><DialogDescription>Access changes immediately. This does not issue a refund or change provider billing.</DialogDescription></DialogHeader>
      {subscription && <div className="space-y-4 text-sm [overflow-wrap:anywhere]">
        <div><p className="font-semibold">{subscription.name}</p><p className="text-gray-400">{subscription.email}</p><p className="mt-1 text-xs text-gray-500">Employer ID: {subscription.accountId}</p></div>
        <section aria-label="Current Employer subscription" className="rounded border border-white/10 p-3"><p className="mb-1 text-xs text-gray-400">Current effective subscription</p><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{employerPlanName(subscription.plan)}</p><span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-300">{subscriptionStatusLabel(subscription.status)}</span></div></section>
        {applied && <section aria-label="Latest applied plan change" className="space-y-2 rounded border border-green-500/25 p-3"><div className="flex flex-wrap gap-2"><p className="font-semibold">{employerPlanName(applied.fromPlan)} → {employerPlanName(applied.appliedPlan)}</p><span className="text-green-400">Applied</span></div><p>Requested: {employerSubscriptionDate(applied.requestedAt)} · WAT</p><p>Effective: {employerSubscriptionDate(applied.actualEffectiveAt)}</p></section>}
        {result.pending && <p className="text-gray-400">An earlier request is retained in history and will not run automatically.</p>}
        {result.status !== "recorded" && <label className="block space-y-2">Lower plan<select aria-label="Requested Employer plan" value={result.toPlan || ""} disabled={result.status !== "ready" || !!result.lockedPlan} onChange={event => flow.selectPlan(event.target.value)} className="min-h-11 w-full rounded border border-white/20 bg-[#1A1A1E] px-3 text-white"><option value="" disabled>Select a lower plan</option>{(result.allowedPlans || []).map(plan => <option key={plan} value={plan}>{employerPlanName(plan)}</option>)}</select></label>}
        {result.toPlan && result.status !== "recorded" && <p className="font-semibold">{employerPlanName(subscription.plan)} → {employerPlanName(result.toPlan)}</p>}
        {result.status !== "recorded" && <p className="text-gray-400">Effective immediately</p>}
        {!result.allowedPlans?.length && <p>No lower plan is available.</p>}
      </div>}
      <p role={["error", "stale", "unconfirmed"].includes(result.status) ? "alert" : "status"} aria-live="polite" className="text-sm">{result.status === "loading" ? "Loading selected Employer…" : sending ? "Applying downgrade…" : result.message}</p>
      {seconds > 0 && <p role="status" className="text-sm text-gray-400">Try again in {seconds} seconds.</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={sending} onClick={flow.close} className="min-h-11 rounded border border-white/20 px-4 py-2 disabled:opacity-50">{result.status === "recorded" ? "Close" : "Go back"}</button>
        <button type="button" disabled={sending || !!seconds || result.status === "loading"} onClick={flow.refresh} className="min-h-11 rounded px-2 py-2 text-blue-400 underline disabled:opacity-50">Refresh status</button>
        {result.status !== "recorded" && <button type="button" disabled={!canSubmit} onClick={flow.send} className="min-h-11 rounded bg-blue-600 px-4 py-2 disabled:opacity-50">{sending ? "Applying…" : result.status === "unconfirmed" ? "Retry same downgrade" : "Downgrade now"}</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
