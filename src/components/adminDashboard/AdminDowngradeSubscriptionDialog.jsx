import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

const planLabel = plan => ({ public: "Public", platinum: "Platinum", silver: "Silver", bronze: "Bronze", free: "Free" })[plan] || "—";

export function AdminDowngradeSubscriptionDialog({ flow }) {
  const { target, result, seconds } = flow;
  const trigger = useRef(null), heading = useRef(null);
  useLayoutEffect(() => { if (target?.trigger) trigger.current = target.trigger; }, [target]);
  const subscription = result.subscription, pending = result.pending;
  const canRecord = ["ready", "retry", "unconfirmed"].includes(result.status) && !pending && result.lowerPlans?.includes(result.toPlan) && !seconds;
  return <Dialog open={!!target} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] text-white"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Request downgrade?</DialogTitle>
        <DialogDescription>Save a downgrade for later. Current access stays active.</DialogDescription></DialogHeader>
      {subscription && <dl className="space-y-2 [overflow-wrap:anywhere]">{[
        ["Account", subscription.name], ["Role", subscription.role === "talent" ? "Talent" : "Employer"],
        ["Email", subscription.email], ["Current plan", planLabel(subscription.plan)],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-gray-400">{label}</dt><dd>{value || "—"}</dd></div>)}</dl>}
      {subscription && <label className="space-y-2">Lower plan
        <select aria-label="Lower plan" value={result.toPlan || ""} disabled={result.status !== "ready" || !!pending} onChange={event => flow.selectPlan(event.target.value)} className="block w-full rounded border border-white/20 bg-[#1A1A1E] p-3 text-white">
          <option value="" disabled>Select a lower plan</option>
          {(result.lowerPlans || []).map(plan => <option key={plan} value={plan}>{planLabel(plan)}</option>)}
        </select>
      </label>}
      {pending && <p role="status">{planLabel(pending.fromPlan)} → {planLabel(pending.toPlan)}: awaiting processing.</p>}
      <p role={["error", "stale", "unconfirmed"].includes(result.status) ? "alert" : "status"} aria-live="polite">{result.status === "loading" ? "Loading downgrade confirmation…" : result.status === "sending" ? "Recording downgrade request…" : result.status === "recorded" ? "Downgrade request saved." : result.message}</p>
      {seconds > 0 && <p role="status">Try again in {seconds} seconds.</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={flow.close} className="min-h-11 rounded border border-white/20 px-4">{pending ? "Close" : "Keep"}</button>
        {["error", "stale", "unconfirmed"].includes(result.status) && <button type="button" disabled={!!seconds} onClick={flow.refresh} className="min-h-11 rounded border px-4 disabled:opacity-50">Refresh confirmation</button>}
        {!pending && !["error", "stale"].includes(result.status) && <button type="button" disabled={!canRecord} onClick={flow.send} className="min-h-11 rounded bg-blue-600 px-4 disabled:opacity-50">{result.status === "sending" ? "Recording…" : "Downgrade"}</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
