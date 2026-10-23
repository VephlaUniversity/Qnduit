const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Shared presentation only. Future confirmations can reuse this renderer;
// existing confirmation senders do not call it in this batch.
export function renderSubscriptionEmail({ title, introduction, fields }) {
  return {
    subject: `Qnduit ${title}`,
    text: `${title}\n\n${introduction}\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nQnduit Team`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;color:#202020;overflow-wrap:anywhere"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(introduction)}</p><table style="width:100%;table-layout:fixed;border-collapse:collapse">${fields.map(([label, value]) => `<tr><th style="width:40%;padding:8px;text-align:left;vertical-align:top">${escapeHtml(label)}</th><td style="padding:8px;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join("")}</table><p>Qnduit Team</p></div>`,
  };
}
