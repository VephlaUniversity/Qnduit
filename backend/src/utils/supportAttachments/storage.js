import path from "node:path";
import { realpath } from "node:fs/promises";
import { Readable } from "node:stream";
import process from "node:process";
import { isWithinDirectory } from "../messageAttachments/stagingBoundary.js";
import { cloudAttachmentStorage, attachmentError } from "../messageAttachments/storage.js";

export async function supportAttachmentStorage() {
  // Separate staging prevents the Message-only recovery worker from treating
  // Support operations as uncommitted direct messages.
  const storage = await cloudAttachmentStorage({ enabled: process.env.SUPPORT_ATTACHMENTS_ENABLED || "false",
    provider: process.env.SUPPORT_ATTACHMENT_STORAGE || "", directory: process.env.SUPPORT_ATTACHMENT_DIR || "" });
  if (process.env.MESSAGE_ATTACHMENT_DIR) {
    const messageRoot = await realpath(process.env.MESSAGE_ATTACHMENT_DIR).catch(() => path.resolve(process.env.MESSAGE_ATTACHMENT_DIR));
    if (isWithinDirectory(storage.root, messageRoot) || isWithinDirectory(messageRoot, storage.root)) throw attachmentError("Support requires separate private attachment staging.", 503);
  }
  return { ...storage, async open(file) {
    const url = await storage.downloadUrl(file.storageKey, file.mime);
    const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: "error" });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw attachmentError("Screenshot unavailable.", 404); }
    return Readable.fromWeb(response.body);
  } };
}
