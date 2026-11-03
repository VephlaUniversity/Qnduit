import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { browserSessions } from "../utils/requestSafety";
import { supportScreenshot } from "../utils/supportAttachments";
import { attachmentSize } from "../utils/messageAttachments";

export default function SupportScreenshot({ ticketId, replyId, file, viewer }) {
  const { user, adminUser } = useAuth();
  const account = viewer === "admin" ? adminUser : user;
  const actor = account && `${account.userType}:${account.id || account._id}`;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const [url, setUrl] = useState(""), [status, setStatus] = useState("idle"), [expanded, setExpanded] = useState(false);
  const request = useRef(null), blob = useRef("");
  useEffect(() => {
    setUrl(""); setExpanded(false); setStatus("idle");
    return () => { request.current?.abort(); if (blob.current) URL.revokeObjectURL(blob.current); blob.current = ""; };
  }, [ticketId, replyId, file.id, token]);
  const load = async download => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller; setStatus("loading");
    try {
      const image = blob.current || await supportScreenshot(ticketId, replyId, file, token, controller.signal);
      if (controller.signal.aborted) { if (image !== blob.current) URL.revokeObjectURL(image); return; }
      blob.current = image; setUrl(image); setStatus("idle");
      if (download) {
        const link = document.createElement("a"); link.href = image; link.download = file.name.replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 100); link.click();
      } else setExpanded(true);
    } catch { if (!controller.signal.aborted) setStatus("error"); }
    finally { if (request.current === controller) request.current = null; }
  };
  return <div className="mt-3 min-w-0 rounded-lg border border-white/10 p-3 text-sm">
    <p className="text-gray-300 [overflow-wrap:anywhere]">{file.name} <span className="text-xs text-gray-500">({attachmentSize(file.size)})</span></p>
    <div className="flex flex-wrap gap-4 text-blue-400">
      <button type="button" disabled={status === "loading"} onClick={() => expanded ? setExpanded(false) : load(false)} className="min-h-11 underline disabled:opacity-50">{expanded ? "Hide screenshot" : "View screenshot"}</button>
      <button type="button" disabled={status === "loading"} onClick={() => load(true)} className="min-h-11 underline disabled:opacity-50">Download screenshot</button>
    </div>
    {status === "loading" && <p role="status" className="text-gray-400">Loading screenshot…</p>}
    {status === "error" && <p role="alert" className="text-red-400">Screenshot unavailable. Please try again.</p>}
    {expanded && url && <img src={url} alt={`Screenshot: ${file.name}`} className="mt-2 h-auto max-h-96 max-w-full rounded object-contain" />}
  </div>;
}
