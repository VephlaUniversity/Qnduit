import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export function AdminCancelSubscriptionDialog({ flow }) {
  const { target, result, seconds } = flow;
  const trigger = useRef(null), heading = useRef(null);
  useLayoutEffect(() => { if (target?.trigger) trigger.current = target.trigger; }, [target]);
  const subscription = result.subscription;
  const canCancel = ["ready", "retry", "unconfirmed"].includes(result.status) && !seconds;
  return <Dialog open={!!target} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] text-white"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Cancel subscription?</DialogTitle>
        <DialogDescription>This immediately removes application paid access.</DialogDescription></DialogHeader>
      {subscription && <dl className="space-y-2 [overflow-wrap:anywhere]">{[
        ["Account", subscription.name], ["Role", subscription.role === "talent" ? "Talent" : "Employer"],
        ["Email", subscription.email], ["Plan", subscription.plan],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-gray-400">{label}</dt><dd>{value || "—"}</dd></div>)}</dl>}
      <p role={["error", "stale", "unconfirmed"].includes(result.status) ? "alert" : "status"} aria-live="polite">{result.status === "loading" ? "Loading cancellation confirmation…" : result.status === "sending" ? "Cancelling subscription…" : result.message}</p>
      {result.notice && <p role="status">{result.notice}</p>}
      {seconds > 0 && <p role="status">Try again in {seconds} seconds.</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={flow.close} className="min-h-11 rounded border border-white/20 px-4">{result.status === "cancelled" ? "Close" : "Keep"}</button>
        {["error", "stale"].includes(result.status) && <button type="button" disabled={!!seconds} onClick={flow.refresh} className="min-h-11 rounded border px-4 disabled:opacity-50">Refresh confirmation</button>}
        {!["cancelled", "error", "stale"].includes(result.status) && <button type="button" disabled={!canCancel} onClick={flow.send} className="min-h-11 rounded bg-red-600 px-4 disabled:opacity-50">{result.status === "sending" ? "Cancelling…" : "Cancel"}</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
