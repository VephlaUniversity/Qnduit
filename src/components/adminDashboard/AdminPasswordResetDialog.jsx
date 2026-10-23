import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
const feedback = {
  sending: "Sending reset instructions…",
  requested: "Reset instructions requested.",
  invalid: "The selected account does not have a valid role and email address. Refresh the Dashboard and try again.",
  expired: "Your admin session is unavailable. Sign in again.",
  forbidden: "This request is not permitted.",
  "delivery-error": "Unable to send reset instructions. Please try again.",
  unconfirmed: "The request could not be confirmed. Check the recipient’s inbox before trying again.",
  limited: "Too many requests. Wait before trying again.",
};
export function AdminPasswordResetDialog({ flow }) {
  const { subject, status, pending, seconds } = flow;
  const opener = useRef(null), heading = useRef(null);
  useLayoutEffect(() => { if (subject?.trigger) opener.current = subject.trigger; }, [subject]);
  const canSend = !pending && !seconds && ["confirm", "delivery-error", "unconfirmed", "limited"].includes(status);
  return <Dialog open={!!subject} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="border-white/10 bg-[#1A1A1E] text-white"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Send password reset instructions?</DialogTitle><DialogDescription>The user will receive an email with a link to choose a new password.</DialogDescription></DialogHeader>
      <dl className="space-y-2 break-words"><div><dt className="text-sm text-gray-400">Selected account</dt><dd>{subject?.name || "Unnamed account"}</dd></div><div><dt className="text-sm text-gray-400">Role</dt><dd>{subject?.type === "talent" ? "Talent" : subject?.type === "employer" ? "Employer" : "Unknown"}</dd></div><div><dt className="text-sm text-gray-400">Email</dt><dd>{subject?.email || "Not provided"}</dd></div></dl>
      {feedback[status] && <p role="status" aria-live="polite">{feedback[status]}</p>}
      {seconds > 0 && <p role="status">Try again in {seconds} seconds.</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={flow.close} className="min-h-11 rounded border border-white/20 px-4">{status === "requested" ? "Close" : "Cancel"}</button>
        {status !== "requested" && <button type="button" disabled={!canSend} onClick={flow.confirm} className="min-h-11 rounded bg-blue-600 px-4 disabled:opacity-50">{pending ? "Sending reset instructions…" : "Send reset link"}</button>}</div>
    </DialogContent>
  </Dialog>;
}
