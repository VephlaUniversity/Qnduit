import { pipeline } from "node:stream/promises";
import Message from "../models/Message.js";
import { localAttachmentStorage } from "../utils/messageAttachments/storage.js";
import { safeAttachmentName } from "../utils/messageAttachments/validate.js";

export async function downloadMessageAttachment(req, res) {
  let handle;
  try {
    const { messageId, attachmentId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(messageId) || !/^[a-f0-9-]{36}$/.test(attachmentId)) return res.status(400).json({ message: 'Invalid message or attachment ID.' });
    const role = req.user.role === 'talent' ? 'Talent' : 'Employer';
    const message = await Message.findOne({ _id: messageId, $or: [{ sender: req.user._id, senderModel: role }, { recipient: req.user._id, recipientModel: role }] }).select('+attachments.storageKey');
    const attachment = message?.attachments?.find(file => file.id === attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment unavailable.' });
    const storage = await localAttachmentStorage();
    const file = await storage.read(attachment.storageKey);
    handle = file.handle;
    if (file.size !== attachment.size) throw new Error('Invalid stored size');
    res.set({ 'Content-Type': attachment.mime, 'Content-Length': String(file.size), 'Content-Disposition': `attachment; filename="${safeAttachmentName(attachment.name)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Accept-Ranges': 'none' });
    await pipeline(handle.createReadStream(), res);
  } catch (error) {
    if (!res.headersSent) res.status(error.status === 503 ? 503 : 404).json({ message: error.status === 503 ? error.message : 'Attachment unavailable.' });
  } finally { await handle?.close().catch(() => {}); }
}
