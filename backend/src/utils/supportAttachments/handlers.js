import multer from "multer";
import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import SupportTicket from "../../models/SupportTicket.js";
import Operation from "../../models/SupportReplyOperation.js";
import { formatTicket, getAccountName } from "../../controllers/supportController.js";
import { ATTACHMENT_LIMITS, validateAttachment, safeAttachmentName } from "../messageAttachments/validate.js";
import { attachmentError } from "../messageAttachments/storage.js";

const scope = req => ({ _id: req.params.ticketId, ...(req.user.role === "admin" ? {} : { ownerId: req.user._id, userType: req.user.role }) });
const hash = value => createHash("sha256").update(value).digest("hex");
const send = (res, status, body) => { if (!res.destroyed && !res.headersSent) res.status(status).json(body); };

async function parseFiles(req, storage, directory) {
  if (Number(req.headers["content-length"]) > ATTACHMENT_LIMITS.requestSize) throw attachmentError("Screenshot request is too large.", 413);
  const controller = new AbortController();
  let total = 0, requestBytes = 0;
  const abort = () => controller.abort();
  const count = chunk => { requestBytes += chunk.length; if (requestBytes > ATTACHMENT_LIMITS.requestSize) { controller.abort(); req.destroy(); } };
  req.once("aborted", abort); req.on("data", count);
  const timer = setTimeout(() => { controller.abort(); req.destroy(); }, 120000);
  try {
    const parser = multer({ storage: {
      _handleFile(request, file, callback) {
        const filePath = storage.path(directory, randomUUID()); let size = 0;
        const counter = new Transform({ transform(chunk, encoding, done) {
          size += chunk.length; total += chunk.length;
          if (size > ATTACHMENT_LIMITS.fileSize || total > ATTACHMENT_LIMITS.totalSize) return done(attachmentError("Use screenshots up to 10 MB each and 25 MB total.", 413));
          done(null, chunk);
        } });
        pipeline(file.stream, counter, createWriteStream(filePath, { flags: "wx", mode: 0o600 }), { signal: controller.signal })
          .then(() => callback(null, { path: filePath, size })).catch(callback);
      },
      _removeFile(request, file, callback) { callback(null); },
    }, limits: { files: 5, fileSize: ATTACHMENT_LIMITS.fileSize + 1, fields: 2, fieldSize: 40000, parts: 7, fieldNameSize: 64, headerPairs: 50 } }).array("attachments", 5);
    await new Promise((resolve, reject) => parser(req, null, error => error ? reject(error) : resolve()));
    if (controller.signal.aborted) throw attachmentError("Screenshot upload interrupted.");
    const files = [];
    for (const file of req.files || []) {
      if (!/\.(jpe?g|png)$/i.test(file.originalname)) throw attachmentError("Use JPG, JPEG or PNG files.");
      let validated;
      try { validated = await validateAttachment(file); }
      catch { throw attachmentError("Invalid or truncated image. Choose a valid JPG, JPEG or PNG file."); }
      if (!["image/jpeg", "image/png"].includes(validated.mime) || !validated.size) throw attachmentError("Invalid screenshot.");
      files.push({ ...validated, path: file.path, originalname: file.originalname });
    }
    return files;
  } finally { clearTimeout(timer); req.off("aborted", abort); req.off("data", count); }
}

export function supportReplyHandler({ storageFactory, legacyHandler }) {
  return async (req, res) => {
    const multipart = req.is("multipart/form-data");
    // Old text-only clients remain compatible. New composers always send a key.
    if (!multipart && req.body?.clientReplyId === undefined && req.body?.attachments === undefined) return legacyHandler(req, res);
    let storage, directory, operation, claimed = false, attempted = false, confirmed = false;
    try {
      if (!mongoose.isValidObjectId(req.params.ticketId)) throw attachmentError("Invalid ticket ID.");
      if (!await SupportTicket.exists(scope(req))) throw attachmentError("Support ticket not found.", 404);
      let files = [];
      const replyId = new mongoose.Types.ObjectId();
      if (multipart) {
        storage = await storageFactory(); directory = await storage.begin(String(replyId));
        files = await parseFiles(req, storage, directory);
      }
      if (Object.keys(req.body || {}).some(key => !["message", "clientReplyId"].includes(key))) throw attachmentError("Invalid reply fields.");
      const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
      if ((!message && !files.length) || message.length > 10000) throw attachmentError("Add a message or attachment; messages must be at most 10,000 characters.");
      const clientId = req.body.clientReplyId;
      if (typeof clientId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(clientId)) throw attachmentError("A valid reply request key is required.");
      const key = hash(`${req.params.ticketId.toLowerCase()}:${req.user.role}:${req.user._id}:${clientId}`);
      const fingerprint = hash(JSON.stringify([message, files.map(file => [file.name, file.mime, file.size, file.sha256])]));
      try {
        operation = new Operation({ _id: key, ticket: req.params.ticketId, actor: req.user._id, role: req.user.role, fingerprint, replyId, directory, state: "processing" });
        await operation.save({ writeConcern: { w: "majority" } });
        claimed = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        operation = await Operation.findById(key).lean();
        if (!operation || operation.fingerprint !== fingerprint) throw attachmentError("This reply request key was already used for different content.", 409);
        const existing = await SupportTicket.findOne({ ...scope(req), "replies.requestKey": key }).read("primary").readConcern("majority").lean();
        if (existing) {
          // No provider upload occurs on a committed replay.
          if (directory) { await storage.discard(directory); directory = null; }
          if (operation.directory) {
            const recoveryStorage = storage || await storageFactory();
            await recoveryStorage.cleanupLocal(operation.directory).catch(() => {});
          }
          await Operation.updateOne({ _id: key }, { $set: { state: "committed" } }).catch(() => {});
          send(res, 200, { success: true, data: formatTicket(existing) }); return;
        }
        // A failed operation can be reclaimed only after all its assets were
        // confirmed uncommitted and discarded. Never lease/reclaim uncertainty.
        operation = await Operation.findOneAndUpdate({ _id: key, state: "failed" }, { $set: { state: "processing", replyId, directory } }, { new: true, writeConcern: { w: "majority" } }).lean();
        if (!operation) throw attachmentError("This reply is still pending or its outcome is unconfirmed. Refresh, then retry the same reply.", 409);
        claimed = true;
      }
      const attachments = [];
      for (const file of files) {
        if (req.aborted || res.destroyed) throw attachmentError("Screenshot upload interrupted.");
        const storageKey = await storage.upload(directory, file.path, file.originalname);
        attachments.push({ id: randomUUID(), storageKey, name: file.name, mime: file.mime, size: file.size, sha256: file.sha256 });
      }
      if (req.aborted || res.destroyed) throw attachmentError("Screenshot upload interrupted.");
      const author = getAccountName(req.user);
      const reply = { _id: replyId, message, requestKey: key, authorId: req.user._id, authorRole: req.user.role, authorName: author, createdAt: new Date(),
        ...(req.user.role === "admin" ? { adminId: req.user._id, adminName: author } : {}), ...(attachments.length ? { attachments } : {}) };
      attempted = true;
      const ticket = await SupportTicket.findOneAndUpdate({ ...scope(req), "replies.requestKey": { $ne: key } }, { $push: { replies: reply } }, { new: true, runValidators: true, writeConcern: { w: "majority" } }).lean();
      if (!ticket) { attempted = false; throw attachmentError("Support ticket unavailable. Refresh before retrying.", 404); }
      confirmed = true;
      await Operation.updateOne({ _id: key }, { $set: { state: "committed" } }).catch(() => {});
      if (directory) await storage.cleanupLocal(directory).catch(() => {});
      directory = null;
      send(res, 200, { success: true, data: formatTicket(ticket) });
    } catch (error) {
      if (attempted && !confirmed) {
        // An absent/read-failed result does not prove an in-flight write failed.
        const saved = await SupportTicket.findOne({ ...scope(req), "replies.requestKey": operation._id }).read("primary").readConcern("majority").lean().catch(() => null);
        if (saved) {
          if (directory) await storage.cleanupLocal(directory).catch(() => {});
          await Operation.updateOne({ _id: operation._id }, { $set: { state: "committed" } }).catch(() => {});
          send(res, 200, { success: true, data: formatTicket(saved) }); return;
        }
        await Operation.updateOne({ _id: operation._id }, { $set: { state: "uncertain" } }).catch(() => {});
        send(res, 503, { success: false, message: "Reply outcome is unconfirmed. Refresh, then retry the same reply; screenshots were retained safely." }); return;
      }
      let discarded = true;
      if (directory) { try { await storage.discard(directory); } catch { discarded = false; } }
      if (claimed) await Operation.updateOne({ _id: operation._id }, { $set: { state: discarded ? "failed" : "uncertain" } }).catch(() => {});
      send(res, error.status || (error instanceof multer.MulterError ? 400 : 503), { success: false, message: error.status ? error.message : error instanceof multer.MulterError ? "Screenshot count, size or form limit exceeded." : "Screenshot reply unavailable. Refresh before retrying." });
    }
  };
}

export function supportDownloadHandler({ storageFactory }) {
  return async (req, res) => {
    try {
      const { ticketId, replyId, attachmentId } = req.params;
      if (![ticketId, replyId].every(value => /^[a-f\d]{24}$/i.test(value)) || !/^[a-f\d-]{36}$/i.test(attachmentId)) throw attachmentError("Invalid screenshot reference.");
      const ticket = await SupportTicket.findOne(scope(req)).select("+replies.attachments.storageKey").lean();
      const file = ticket?.replies?.find(reply => String(reply._id) === replyId)?.attachments?.find(row => row.id === attachmentId);
      if (!file || !["image/jpeg", "image/png"].includes(file.mime)) throw attachmentError("Screenshot unavailable.", 404);
      const storage = await storageFactory(); const stream = await storage.open(file);
      res.set({ "Content-Type": file.mime, "Content-Length": String(file.size), "Content-Disposition": `${req.query.view === "1" ? "inline" : "attachment"}; filename="${safeAttachmentName(file.name)}"`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Accept-Ranges": "none" });
      await pipeline(stream, res);
    } catch (error) {
      if (!res.headersSent) send(res, error.status || 503, { success: false, message: error.status === 400 ? error.message : "Screenshot unavailable." });
      else res.destroy();
    }
  };
}
