import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import Message from "../models/Message.js";
import { cloudAttachmentStorage } from "../utils/messageAttachments/storage.js";
import { safeAttachmentName } from "../utils/messageAttachments/validate.js";

export async function downloadMessageAttachment(req, res) {
  try {
    const { messageId, attachmentId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(messageId) || !/^[a-f0-9-]{36}$/.test(attachmentId)) {
      return res.status(400).json({ message: "Invalid message or attachment ID." });
    }
    const role = req.user.role === "talent" ? "Talent" : req.user.role === "employer" ? "Employer" : null;
    if (!role) return res.status(404).json({ message: "Attachment unavailable." });

    const message = await Message.findOne({
      _id: messageId,
      $or: [
        { sender: req.user._id, senderModel: role },
        { recipient: req.user._id, recipientModel: role },
      ],
    }).select("+attachments.storageKey");
    const attachment = message?.attachments?.find(file => file.id === attachmentId);
    if (!attachment) return res.status(404).json({ message: "Attachment unavailable." });

    const storage = await cloudAttachmentStorage();
    const url = await storage.downloadUrl(attachment.storageKey, attachment.mime);

    const upstream = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel().catch(() => {});
      return res.status(404).json({ message: "Attachment unavailable." });
    }

    res.set({
      "Content-Type": attachment.mime,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename="${safeAttachmentName(attachment.name)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Accept-Ranges": "none",
    });
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    if (!res.headersSent && !res.destroyed) {
      res.status(error.status === 503 ? 503 : 404).json({ message: error.status === 503 ? error.message : "Attachment unavailable." });
    } else if (!res.destroyed) {
      res.destroy(error);
    }
  }
}
