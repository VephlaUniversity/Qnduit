const timestamp = value => value == null || value === "" ? NaN : new Date(value).getTime();
export function formatSupportTime(value) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return "Date/time unavailable";
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(time)} WAT`;
}

// Presentation only: never rewrite stored history or manufacture missing dates.
export function supportConversation(ticket) {
  const entries = [{ key: "original", message: ticket.message, createdAt: ticket.createdAt, author: ticket.name || "Account owner", role: ticket.userType, original: true },
    ...(Array.isArray(ticket.replies) ? ticket.replies : []).map((reply, index) => ({
      key: `reply-${reply._id || index}`, replyId: reply._id, attachments: reply.attachments || [], message: reply.message, createdAt: reply.createdAt,
      author: reply.authorRole && reply.authorRole !== "admin" ? reply.authorName || "Account owner" : reply.adminName || reply.authorName || "Support Team",
      role: reply.authorRole || (reply.adminId || reply.adminName ? "admin" : ""),
    }))];
  return entries.map((entry, index) => ({ ...entry, index, time: timestamp(entry.createdAt) }))
    .sort((a, b) => {
      const aKnown = Number.isFinite(a.time), bKnown = Number.isFinite(b.time);
      if (aKnown && bKnown) return a.time - b.time || a.index - b.index;
      return aKnown ? -1 : bKnown ? 1 : a.index - b.index;
    });
}
