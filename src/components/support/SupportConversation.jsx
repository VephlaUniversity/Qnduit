import SupportScreenshot from "./SupportScreenshot";
import { formatSupportTime, supportConversation } from "../utils/supportConversation";

export default function SupportConversation({ ticket, viewer = "user" }) {
  const entries = supportConversation(ticket);
  return <section aria-label="Conversation" className="space-y-3">
    <h3 className="text-sm font-semibold text-white">Conversation</h3>
    {entries.some(entry => !Number.isFinite(entry.time)) && <p className="text-xs text-gray-400">Messages without a stored date/time appear last, in their saved order.</p>}
    <ol className="space-y-3">
      {entries.map(entry => <li key={entry.key} className="min-w-0 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            {entry.role === "admin" && <img src="/images/header-logo.svg" alt="" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 object-contain" />}
            <span className="min-w-0 break-words text-sm font-medium text-blue-400">{entry.author}{entry.role ? ` (${entry.role === "admin" ? "Admin" : entry.role === "talent" ? "Talent" : "Employer"})` : ""}{entry.original ? " · Original message" : ""}</span>
          </div>
          <time dateTime={Number.isFinite(entry.time) ? new Date(entry.time).toISOString() : undefined} className="text-xs text-gray-400">{formatSupportTime(entry.createdAt)}</time>
        </div>
        {entry.message && <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300 [overflow-wrap:anywhere]">{entry.message}</p>}
        {entry.attachments?.map(file => <SupportScreenshot key={file.id} ticketId={ticket.id} replyId={entry.replyId} file={file} viewer={viewer} />)}
      </li>)}
    </ol>
  </section>;
}
