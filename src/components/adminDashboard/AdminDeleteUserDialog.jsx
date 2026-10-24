import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
export function AdminDeleteUserDialog({ flow }) {
  const opener = useRef(null), cancel = useRef(null);
  useLayoutEffect(() => { if (flow.subject?.trigger) opener.current = flow.subject.trigger; }, [flow.subject]);
  return <Dialog open={!!flow.subject} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="border-white/10 bg-[#1A1A1E] text-white" showCloseButton={!flow.pending}
      onEscapeKeyDown={event => { if (flow.pending) event.preventDefault(); }}
      onInteractOutside={event => { if (flow.pending) event.preventDefault(); }}
      onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); (opener.current?.isConnected ? opener.current : document.querySelector("h1"))?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle>Delete user?</DialogTitle><DialogDescription className="break-words">Are you sure you want to delete <strong className="text-white">{flow.subject?.name || "this user"}</strong>? This removes the selected {flow.subject?.type === "employer" ? "Employer" : "Talent"} account and its access.</DialogDescription></DialogHeader>
      {flow.result.message && <p role={flow.result.status === "deleted" ? "status" : "alert"}>{flow.result.message}</p>}
      {flow.pending && <p role="status">Deleting user…</p>}
      {flow.seconds > 0 && <p role="status">Try again in {flow.seconds} seconds.</p>}
      <div className="flex justify-end gap-3"><button ref={cancel} type="button" disabled={flow.pending} onClick={flow.close} className="min-h-11 rounded border px-4 disabled:opacity-50">{flow.result.status === "deleted" ? "Close" : "Cancel"}</button>
        {flow.result.status !== "deleted" && <button type="button" disabled={flow.pending || flow.seconds > 0} onClick={flow.confirm} className="min-h-11 rounded bg-red-600 px-4 disabled:opacity-50">{flow.pending ? "Deleting…" : "Delete User"}</button>}</div>
    </DialogContent>
  </Dialog>;
}
