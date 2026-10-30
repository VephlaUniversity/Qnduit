import { useRef, useState } from "react";
import { EmployerPlans } from "../EmployerPlans";
import { validCheckoutUrl } from "../utils/employerPlanRequest";
import { useEmployerPlanRequest } from "../hooks/useEmployerPlanRequest";
import { employerPlanName } from "../utils/employerSubscription";
import { employerSubscriptionDate } from "../utils/employerSubscriptionDate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export default function EmployerPlanRequests({ currentPlan, onApplied }) {
  const { result, refresh, send, upgrade } = useEmployerPlanRequest();
  const [selection, setSelection] = useState(null);
  const trigger = useRef(null), goBack = useRef(null), refreshButton = useRef(null);
  const sending = result.status === "sending", uncertain = result.status === "unconfirmed";
  const stale = result.data && result.data.currentPlan !== currentPlan;
  const disabled = result.status !== "ready" || stale;
  const toPlan = uncertain ? result.toPlan : selection, latest = result.data?.latestAction;
  const isUpgrade = ["free","bronze","silver","platinum"].indexOf(toPlan) > ["free","bronze","silver","platinum"].indexOf(currentPlan);
  const pendingUpgrade = result.data?.upgradeRequest?.status === "awaiting_payment" ? result.data.upgradeRequest : null;
  const higherPlans = pendingUpgrade ? [] : result.data?.upgradePlans || [];
  const choosePlan = plan => { if (!disabled && (result.data?.allowedPlans?.includes(plan) || higherPlans.includes(plan))) { trigger.current = document.activeElement; setSelection(plan); } };
  const submit = () => isUpgrade ? upgrade(toPlan) : send(toPlan, () => { setSelection(null); onApplied?.(); });
  return <section aria-label="Subscription plan changes" className="space-y-6 text-white">
    <div className="space-y-2 text-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-gray-400">Upgrades require verified payment. Downgrades take effect immediately.</p>
        <button ref={refreshButton} type="button" onClick={refresh} disabled={sending || result.status === "loading"} aria-label="Refresh plan change status" className="min-h-11 rounded px-1 text-blue-400 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50">Refresh status</button></div>
      {result.status === "loading" && <p role="status">Loading plan options…</p>}
      {result.message && <p role={["error", "unconfirmed", "retry"].includes(result.status) ? "alert" : "status"}>{result.message}</p>}
      {stale && <p role="alert">Your plan changed. Refresh plan and downgrade status before continuing.</p>}
      {latest && <section aria-label="Latest applied plan change" className="space-y-2 rounded-lg border border-white/10 bg-[#1A1A1E] p-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{employerPlanName(latest.fromPlan)} → {employerPlanName(latest.appliedPlan)}</h2><span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-400">Applied</span></div>
        <div className="flex flex-col gap-x-6 gap-y-1 text-gray-400 sm:flex-row sm:flex-wrap"><p>Requested: {employerSubscriptionDate(latest.requestedAt)}</p><p>Effective: {employerSubscriptionDate(latest.actualEffectiveAt)}</p></div>
      </section>}
      {pendingUpgrade && <section aria-label="Upgrade awaiting payment" className="space-y-2 rounded-lg border border-blue-500/25 bg-[#1A1A1E] p-4">
        <p className="font-semibold">{employerPlanName(pendingUpgrade.fromPlan)} → {employerPlanName(pendingUpgrade.toPlan)} <span className="text-blue-300">Awaiting payment</span></p>
        <p>Requested: {employerSubscriptionDate(pendingUpgrade.requestedAt)}</p><p>Your current access stays unchanged until payment is verified.</p>
        {validCheckoutUrl(result.data?.upgradeCheckoutUrl) ? <a className="inline-flex min-h-11 items-center text-blue-400 underline" href={result.data.upgradeCheckoutUrl}>Resume checkout</a> : <p>Checkout is unconfirmed. Refresh status to recover a saved link. If no link appears, contact Support with request reference {pendingUpgrade.requestId} before making another payment.</p>}
      </section>}
      {result.data?.upgradeRequest?.status === "failed" && <p role="status">The upgrade payment was unsuccessful. Your current access is unchanged.</p>}
      {result.data?.pendingRequest && <p className="text-gray-400">An earlier plan-change request is retained in history. It has not been applied and will not run automatically.</p>}
    </div>
    <EmployerPlans selectedPlan={selection || currentPlan} currentPlan={currentPlan} requestMode upgradePlans={higherPlans} showPayLater={false} disabled={disabled} onSelectPlan={choosePlan} onPlanAction={choosePlan} />
    {currentPlan !== "free" && <button type="button" disabled={disabled || !result.data?.allowedPlans?.includes("free")} onClick={() => choosePlan("free")} className="rounded-full border border-[#5F8DD7] px-6 py-3 disabled:opacity-50">Downgrade to Free</button>}
    <Dialog open={!!toPlan && toPlan !== currentPlan && !(isUpgrade && pendingUpgrade)} onOpenChange={open => { if (!open && !sending && !uncertain) setSelection(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] p-5 text-white sm:p-6"
        onOpenAutoFocus={event => { event.preventDefault(); goBack.current?.focus(); }}
        onCloseAutoFocus={event => { event.preventDefault(); (trigger.current?.isConnected && !trigger.current.disabled ? trigger.current : refreshButton.current)?.focus(); }}>
        <DialogHeader><DialogTitle>{isUpgrade ? "Upgrade through checkout?" : "Downgrade now?"}</DialogTitle><DialogDescription>{isUpgrade ? "Your current access stays unchanged until your payment is verified." : "Your access changes immediately. This does not issue a refund or change provider billing."}</DialogDescription></DialogHeader>
        <p className="text-lg font-semibold">{employerPlanName(currentPlan)} → {employerPlanName(toPlan)}</p><p className="text-sm text-gray-400">{isUpgrade ? "Effective after verified payment" : "Effective immediately"}</p>
        {result.message && <p role="status">{result.message}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button ref={goBack} type="button" disabled={sending || uncertain} onClick={() => setSelection(null)} className="min-h-11 w-full rounded border border-white/20 px-4 py-2 disabled:opacity-50 sm:w-auto">Go back</button>
          {["error", "unconfirmed"].includes(result.status) && <button type="button" onClick={refresh} className="min-h-11 w-full rounded border px-4 py-2 sm:w-auto">Refresh confirmation</button>}
          <button type="button" disabled={sending || !["ready", "unconfirmed", "retry"].includes(result.status) || stale} onClick={submit} className="min-h-11 w-full rounded bg-blue-600 px-4 py-2 disabled:opacity-50 sm:w-auto">{sending ? isUpgrade ? "Opening checkout…" : "Applying…" : uncertain ? "Retry same action" : isUpgrade ? "Continue to checkout" : "Downgrade now"}</button>
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
