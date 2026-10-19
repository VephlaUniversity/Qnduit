import axios from "axios";
import { API_BASE_URL } from "./api";

export const MESSAGE_FILE_LIMITS = { count: 5, fileSize: 10000000, totalSize: 25000000 };
export const MESSAGE_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
export function validateMessageFiles(files) {
  if (files.length > MESSAGE_FILE_LIMITS.count) return "Choose no more than 5 attachments.";
  if (files.some(file => !/\.(jpe?g|png|webp|pdf)$/i.test(file.name))) return "Use JPG, PNG, static WebP or PDF files.";
  if (files.some(file => !file.size || file.size > MESSAGE_FILE_LIMITS.fileSize)) return "Each attachment must contain data and be no larger than 10 MB.";
  if (files.reduce((sum, file) => sum + file.size, 0) > MESSAGE_FILE_LIMITS.totalSize) return "Attachments must total no more than 25 MB.";
  return "";
}
export function messageSendBody(chat, attempt) {
  const body = { recipientId: chat._id, recipientModel: chat.role, text: attempt.text, clientMessageId: attempt.clientMessageId };
  if (!attempt.files?.length) return body;
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) form.append(key, value);
  for (const entry of attempt.files) form.append("attachments", entry.file, entry.file.name);
  return form;
}
export const sameMessageFiles = (left = [], right = []) => left.length === right.length && left.every((entry, i) => entry.id === right[i].id);
export function messagePreview(message) {
  if (message?.text?.trim()) return message.text;
  const files = message?.attachments || [];
  return files.length === 1 ? `Attachment: ${files[0].name}` : files.length ? `${files.length} attachments` : message?.text || "";
}
export const attachmentSize = bytes => bytes < 1000 ? `${bytes} B` : bytes < 1000000 ? `${(bytes / 1000).toFixed(1)} KB` : `${(bytes / 1000000).toFixed(1)} MB`;
export async function downloadMessageFile(messageId, attachment, token, signal) {
  if (!/^[a-f\d]{24}$/i.test(messageId) || !/^[a-f\d-]{36}$/i.test(attachment.id) || !token) throw new Error("Invalid attachment reference");
  const { data } = await axios.get(`${API_BASE_URL}/api/messages/${messageId}/attachments/${attachment.id}`, {
    responseType: "blob", signal, timeout: 30000, headers: { Authorization: `Bearer ${token}` },
  });
  if (signal.aborted || !(data instanceof Blob) || data.size !== attachment.size) throw new Error("Attachment unavailable");
  const url = URL.createObjectURL(data);
  let timer;
  const release = () => { clearTimeout(timer); URL.revokeObjectURL(url); };
  try {
    const link = document.createElement("a");
    link.href = url; link.download = attachment.name.replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 100) || "attachment";
    document.body.appendChild(link); link.click(); link.remove();
    timer = setTimeout(release, 1000);
    return release;
  } catch (error) { release(); throw error; }
}
