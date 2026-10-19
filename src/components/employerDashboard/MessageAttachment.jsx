import { useLayoutEffect, useRef, useState } from "react";
import { attachmentSize, downloadMessageFile } from "../utils/messageAttachments";

export default function MessageAttachment({ messageId, attachment, token }) {
  const [status, setStatus] = useState("idle");
  const request = useRef(null), release = useRef(null);
  useLayoutEffect(() => {
    setStatus("idle");
    return () => { request.current?.abort(); release.current?.(); };
  }, [messageId, attachment.id, token]);
  const download = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller; setStatus("loading");
    try {
      release.current?.();
      release.current = await downloadMessageFile(messageId, attachment, token, controller.signal);
      if (!controller.signal.aborted) setStatus("idle");
    } catch {
      if (!controller.signal.aborted) setStatus("error");
    } finally { if (request.current === controller) request.current = null; }
  };
  return <div className="mt-2 min-w-0 rounded border border-white/20 p-2 text-sm">
    <p className="[overflow-wrap:anywhere]">{attachment.name}</p>
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs opacity-80">{attachmentSize(attachment.size)}</span>
      <button type="button" onClick={download} disabled={status === "loading"} aria-label={`Download ${attachment.name}`}
        className="min-h-8 underline disabled:opacity-50 focus-visible:outline focus-visible:outline-2">
        {status === "loading" ? "Downloading…" : "Download"}
      </button>
    </div>
    {status === "error" && <p role="alert" className="mt-1">Unable to download attachment. Please try again.</p>}
  </div>;
}
