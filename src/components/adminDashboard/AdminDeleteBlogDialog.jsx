import { useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";

export function AdminDeleteBlogDialog({ flow, state }) {
  const opener = useRef(null), cancel = useRef(null), heading = useRef(null);
  const pending = ["loading", "sending"].includes(state.status);
  useLayoutEffect(() => { if (state.subject?.trigger) opener.current = state.subject.trigger; }, [state.subject]);
  return <Dialog open={!!state.subject} onOpenChange={open => { if (!open) flow.close(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#1A1A1E] text-white" showCloseButton={!pending}
      onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
      onInteractOutside={event => { if (pending) event.preventDefault(); }}
      onOpenAutoFocus={event => { event.preventDefault(); (cancel.current?.disabled ? heading.current : cancel.current)?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); (opener.current?.isConnected ? opener.current : document.getElementById("blog-management-heading"))?.focus({ preventScroll: true }); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>Delete blog post?</DialogTitle><DialogDescription className="[overflow-wrap:anywhere]">
        {state.subject?.title && <><strong className="text-white">{state.subject.title}</strong> ({state.subject.status === "published" ? "Published" : "Draft"}). </>}
        This permanently deletes the saved post.
      </DialogDescription></DialogHeader>
      {state.message && <p role={pending || state.status === "missing" ? "status" : "alert"} className="[overflow-wrap:anywhere]">{state.message}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button ref={cancel} type="button" disabled={pending} onClick={flow.close} className="min-h-11 border border-white/20 px-4 text-white hover:bg-white/5">{state.status === "missing" ? "Close" : "Cancel"}</Button>
        {state.status === "blocked" && <Button type="button" onClick={flow.refresh} className="min-h-11 border border-white/20 px-4 text-white hover:bg-white/5">Refresh post</Button>}
        {!["blocked", "missing"].includes(state.status) && <Button type="button" disabled={state.status !== "ready"} onClick={flow.confirm} className="min-h-11 bg-red-600 px-4 text-white hover:bg-red-700">{state.status === "sending" ? "Deleting…" : "Delete post"}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
