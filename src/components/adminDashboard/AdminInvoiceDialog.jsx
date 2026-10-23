import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export function AdminInvoiceDialog({ flow }) {
  const { target, result, seconds } = flow;
  const trigger = useRef(null), heading = useRef(null);
  useLayoutEffect(() => { if (target?.trigger) trigger.current = target.trigger; }, [target]);
  const invoice = result.invoice, pending = ["loading", "sending"].includes(result.status);
  const canSend = ["ready", "retry"].includes(result.status) && !result.blocked && !seconds;
  return <Dialog open={!!target} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] text-white"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Email Invoice?</DialogTitle><DialogDescription>Send the Invoice for this account’s active subscription.</DialogDescription></DialogHeader>
      {invoice && <dl className="space-y-2 [overflow-wrap:anywhere]">{[
        ["Account", invoice.name], ["Role", invoice.role === "talent" ? "Talent" : "Employer"], ["Recipient", invoice.recipient],
        ["Plan", invoice.plan], ["Recorded payment amount", `${invoice.recordedPaymentAmount} ${invoice.currency}`],
        ["Payment reference", invoice.reference], ["Recorded payment date", invoice.paymentDate],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-gray-400">{label}</dt><dd>{value}</dd></div>)}</dl>}
      <p role={result.status === "error" ? "alert" : "status"} aria-live="polite">{result.status === "requested" ? "Invoice email sent successfully." : result.status === "loading" ? "Loading Invoice preview…" : result.status === "sending" ? "Sending Invoice…" : result.message}</p>
      {result.blocked && <p role="status">A previous Invoice send is pending or unconfirmed. Check the inbox and request administrator review before another send.</p>}
      {seconds > 0 && <p role="status">Try again in {seconds} seconds.</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={flow.close} className="min-h-11 rounded border border-white/20 px-4">{result.status === "requested" ? "Close" : "Cancel"}</button>
        {["error", "stale"].includes(result.status) && <button type="button" onClick={flow.refresh} className="min-h-11 rounded border px-4">Refresh preview</button>}
        {!["requested", "error", "stale", "unconfirmed"].includes(result.status) && <button type="button" disabled={!canSend || pending} onClick={flow.send} className="min-h-11 rounded bg-blue-600 px-4 disabled:opacity-50">{result.status === "sending" ? "Sending Invoice…" : "Send Invoice"}</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
