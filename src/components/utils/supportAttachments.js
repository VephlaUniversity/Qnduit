import axios from "axios";
import { API_BASE_URL } from "./api";

export function validateSupportFiles(files) {
  if (files.length > 5) return "Choose no more than 5 attachments.";
  if (files.some(file => !/\.(jpe?g|png)$/i.test(file.name))) return "Use JPG, JPEG or PNG files.";
  if (files.some(file => !file.size || file.size > 10000000)) return "Each screenshot must contain data and be no larger than 10 MB.";
  if (files.reduce((sum, file) => sum + file.size, 0) > 25000000) return "Screenshots must total no more than 25 MB.";
  return "";
}
export function supportReplyBody(attempt) {
  if (!attempt.files.length) return { message: attempt.message, clientReplyId: attempt.key };
  const body = new FormData(); body.append("message", attempt.message); body.append("clientReplyId", attempt.key);
  for (const file of attempt.files) body.append("attachments", file, file.name);
  return body;
}
export async function supportScreenshot(ticketId, replyId, file, token, signal) {
  if (![ticketId, replyId].every(id => /^[a-f\d]{24}$/i.test(id)) || !/^[a-f\d-]{36}$/i.test(file.id) || !token) throw Error("Invalid screenshot reference");
  const { data } = await axios.get(`${API_BASE_URL}/api/support/tickets/${ticketId}/replies/${replyId}/attachments/${file.id}?view=1`, {
    responseType: "blob", timeout: 30000, signal, headers: { Authorization: `Bearer ${token}` },
  });
  if (signal.aborted || !(data instanceof Blob) || data.size !== file.size || (!["image/jpeg", "image/png"].includes(file.mime) || data.type !== file.mime)) throw Error("Screenshot unavailable");
  return URL.createObjectURL(data);
}
