import multer from "multer";
import { randomUUID, randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import Message from "../../models/Message.js";
import { cloudAttachmentStorage, attachmentError } from "./storage.js";
import { ATTACHMENT_LIMITS, validateAttachment } from "./validate.js";

export const activeAttachmentUploads = new Set();

export async function ingestMessageAttachments(req, res, next) {
  if (!req.is("multipart/form-data")) return next();
  let upload;
  let timer;
  let countRequest;
  try {
    if (Number(req.headers["content-length"]) > ATTACHMENT_LIMITS.requestSize) {
      throw attachmentError("Attachment request exceeds its size limit.", 413);
    }
    const storage = await cloudAttachmentStorage();
    const indexes = await Message.collection.indexes();
    if (!indexes.some(index => index.unique && Object.keys(index.key).length === 3 && Object.keys(index.partialFilterExpression || {}).length === 1 && index.key.sender === 1 && index.key.senderModel === 1 && index.key.clientMessageId === 1 && index.partialFilterExpression?.clientMessageId?.$type === "string")) {
      throw attachmentError("Attachment sending is unavailable until messaging indexes are configured.", 503);
    }

    const messageId = randomBytes(12).toString("hex");
    const directory = await storage.begin(messageId);
    upload = { storage, directory, messageId, bytes: 0, attempted: false, controller: new AbortController() };
    req.attachmentUpload = upload;
    activeAttachmentUploads.add(directory);

    const cleanup = async () => {
      activeAttachmentUploads.delete(directory);
      if (upload.attempted) await storage.cleanupLocal(directory);
      else await storage.discard(directory);
    };
    const disconnect = () => {
      upload.controller.abort();
      cleanup().catch(() => {});
    };
    req.once("aborted", disconnect);
    res.once("close", () => { if (!res.writableFinished) disconnect(); });
    res.once("finish", () => { cleanup().catch(() => {}); });

    let requestBytes = 0;
    countRequest = chunk => {
      requestBytes += chunk.length;
      if (requestBytes > ATTACHMENT_LIMITS.requestSize) {
        upload.controller.abort();
        req.destroy();
      }
    };
    req.on("data", countRequest);
    timer = setTimeout(() => { upload.controller.abort(); req.destroy(); }, 120000);

    const parser = multer({
      storage: {
        _handleFile(request, file, callback) {
          const id = randomUUID();
          const filePath = storage.path(directory, id);
          let fileBytes = 0;
          const counter = new Transform({
            transform(chunk, encoding, done) {
              upload.bytes += chunk.length;
              fileBytes += chunk.length;
              if (fileBytes > ATTACHMENT_LIMITS.fileSize) return done(attachmentError("Attachment exceeds the 10 MB file limit."));
              if (upload.bytes > ATTACHMENT_LIMITS.totalSize) return done(attachmentError("Attachments exceed the 25 MB total limit."));
              done(null, chunk);
            },
          });
          pipeline(file.stream, counter, createWriteStream(filePath, { flags: "wx", mode: 0o600 }), { signal: upload.controller.signal })
            .then(() => callback(null, { path: filePath, filename: id, size: counter.bytesWritten }))
            .catch(callback);
        },
        _removeFile(request, file, callback) {
          callback(null);
        },
      },
      limits: { files: ATTACHMENT_LIMITS.files, fileSize: ATTACHMENT_LIMITS.fileSize + 1, fields: 4, fieldSize: 40000, parts: 9, fieldNameSize: 64, headerPairs: 50 },
    }).array("attachments", ATTACHMENT_LIMITS.files);

    try {
      await new Promise((resolve, reject) => parser(req, res, error => error ? reject(error) : resolve()));
      if (upload.controller.signal.aborted) throw attachmentError("Attachment upload was interrupted.");
      if (Object.keys(req.body).some(key => !["recipientId", "recipientModel", "text", "clientMessageId"].includes(key))) {
        throw attachmentError("Invalid message fields.");
      }
      if (typeof req.body.clientMessageId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(req.body.clientMessageId)) {
        throw attachmentError("Attachments require a valid message request key.");
      }

      req.messageAttachments = [];
      for (const file of req.files || []) {
        const validated = await validateAttachment(file);
        if (upload.controller.signal.aborted || req.aborted || res.destroyed) throw attachmentError("Attachment upload was interrupted.");
        const storageKey = await storage.upload(directory, file.path, file.originalname);
        req.messageAttachments.push({ id: randomUUID(), storageKey, ...validated });
        if (upload.controller.signal.aborted || req.aborted || res.destroyed) throw attachmentError("Attachment upload was interrupted.");
      }
    } finally {
      clearTimeout(timer);
      req.removeListener("data", countRequest);
    }
    next();
  } catch (error) {
    if (timer) clearTimeout(timer);
    if (countRequest) req.removeListener("data", countRequest);
    if (upload) {
      activeAttachmentUploads.delete(upload.directory);
      await upload.storage.discard(upload.directory).catch(() => {});
    }
    if (!res.headersSent && !res.destroyed) {
      res.status(error.status || (error instanceof multer.MulterError ? 400 : 503)).json({
        success: false,
        message: error.status ? error.message : error instanceof multer.MulterError ? "Attachment count, size or form limit exceeded." : "Private attachment storage is unavailable.",
      });
    }
  }
}
