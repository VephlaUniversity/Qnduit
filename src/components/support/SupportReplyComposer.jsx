import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { browserSessions } from "../utils/requestSafety";
import { readSupportAttempt, rememberSupportAttempt, forgetSupportAttempt } from "../utils/supportReplyAttempts";
import { supportReplyBody, validateSupportFiles } from "../utils/supportAttachments";

export default function SupportReplyComposer(props) {
  const { ticketId, viewer = "user" } = props;
  const { user, adminUser } = useAuth();
  const account = viewer === "admin" ? adminUser : user;
  const actor = account && `${account.userType}:${account.id || account._id}`;
  const token = browserSessions().find(owner => owner.actor === actor)?.token;
  const scope = `${actor}:${token}:${ticketId}`;
  return <ReplyForm key={scope} {...props} scope={scope} />;
}

function ReplyForm({ ticketId, onSend, disabled = false, label = "Your reply", scope }) {
  const saved = readSupportAttempt(scope);
  const [message, setMessage] = useState(saved?.message || ""), [files, setFiles] = useState(saved?.files || []), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const fileInput = useRef(null);
  const attempt = useRef(saved || null), pending = useRef(false), active = useRef(true);
  const [locked, setLocked] = useState(!!saved);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const send = async event => {
    event.preventDefault(); if (pending.current || disabled) return;
    const invalid = validateSupportFiles(files);
    if (invalid || (!message.trim() && !files.length) || message.trim().length > 10000) { setError(invalid || "Add a message or attachment (message limit: 10,000 characters)."); return; }
    // Keep this exact key, text and File snapshot after transport/uncertain errors.
    // Editing is blocked until the outcome has been confirmed by a safe retry.
    if (!attempt.current) attempt.current = { key: crypto.randomUUID(), message: message.trim(), files: [...files] };
    rememberSupportAttempt(scope, attempt.current);
    pending.current = true; setBusy(true); setError(""); setLocked(true);
    try {
      await onSend(supportReplyBody(attempt.current));
      forgetSupportAttempt(scope);
      if (active.current) { setMessage(""); setFiles([]); setLocked(false); attempt.current = null; }
    } catch (failure) {
      if (active.current) {
        const status = failure.response?.status;
        // Validation/size/type rejection happened before commit. Allow corrections.
        if ([400, 413, 415].includes(status)) { setLocked(false); attempt.current = null; forgetSupportAttempt(scope); }
        setError(failure.response?.data?.message || "Reply not confirmed. Refresh the conversation, then retry this same reply safely.");
      }
    } finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const inputId = `support-reply-${ticketId}`;
  return <form onSubmit={send} className="mt-4 space-y-3">
    <label htmlFor={inputId} className="block text-sm text-gray-400">{label}</label>
    <textarea id={inputId} value={message} onChange={event => setMessage(event.target.value)} maxLength={10000} disabled={disabled || busy || locked} rows={3} className="w-full rounded-lg border border-white/10 bg-[#0E0E10] px-4 py-3 text-sm text-white disabled:opacity-60" />
    <span id={`${inputId}-attachment-label`} className="sr-only">Attachments. JPG, JPEG and PNG files.</span>
    <input ref={fileInput} id={`${inputId}-files`} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple hidden aria-label="Attachments" disabled={disabled || busy || locked} onChange={event => {
      const next = Array.from(event.target.files || []), invalid = validateSupportFiles(next);
      setError(invalid); setFiles(invalid ? [] : next); event.target.value = "";
    }} />
    <div role="group" aria-label="Attachments" className="flex min-w-0 flex-wrap items-start gap-2">
      <button type="button" onClick={() => fileInput.current?.click()} disabled={disabled || busy || locked} aria-label="Choose files for attachments" aria-describedby={`${inputId}-attachment-label`} aria-controls={`${inputId}-files`} className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-[#2A2A2E] px-3 py-2 text-sm text-blue-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50">Choose files</button>
      {files.map((file, index) => <span key={index} className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1E] px-3 text-sm text-gray-300">
        <span className="min-w-0 py-2 [overflow-wrap:anywhere]">{file.name}</span>
        <button type="button" disabled={disabled || busy || locked} onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setError(""); }} aria-label={`Remove ${file.name}`} className="min-h-11 shrink-0 text-blue-400 hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40">Remove</button>
      </span>)}
    </div>
    <span role="status" className="sr-only">{files.length ? `${files.length} attachment${files.length === 1 ? "" : "s"} selected` : ""}</span>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button type="submit" disabled={disabled || busy || (!message.trim() && !files.length)} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Sending…" : locked ? "Retry same reply" : "Send Reply"}</button>
  </form>;
}
