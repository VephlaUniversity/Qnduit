import process from "node:process";
import { opendir } from "node:fs/promises";
import Message from "../../models/Message.js";
import { cloudAttachmentStorage } from "./storage.js";
import { activeAttachmentUploads } from "./ingest.js";

let directoryScan, scanRoot, recovering = false;

export async function recoverAttachmentOrphans({ olderThanMs = 86400000, limit = 50 } = {}) {
  if (!Number.isFinite(olderThanMs) || olderThanMs < 120000 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Invalid recovery bounds");
  if (recovering) return { scanned: 0, removed: 0, stagingRemoved: 0, discardedOperations: 0, retained: 0, failed: 0 };
  recovering = true;
  let scanned = 0, removed = 0, stagingRemoved = 0, discardedOperations = 0, retained = 0, failed = 0;
  try {
    const storage = await cloudAttachmentStorage();
    if (!directoryScan || scanRoot !== storage.root) {
      await directoryScan?.close();
      directoryScan = await opendir(storage.root); scanRoot = storage.root;
    }
    while (scanned < 200 && removed < limit) {
      const entry = await directoryScan.read();
      if (!entry) { await directoryScan.close(); directoryScan = null; break; }
      scanned++;
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      if (activeAttachmentUploads.has(entry.name)) { retained++; continue; }
      try {
        const intent = await storage.readIntent(entry.name);
        if (Date.now() - intent.createdAt < olderThanMs) { retained++; continue; }
        const keys = intent.trackingAvailable ? intent.assets.map(asset => asset.publicId) : [];
        const confirmed = await Message.exists({ $or: [
          { _id: intent.messageId }, ...(keys.length ? [{ "attachments.storageKey": { $in: keys } }] : []),
        ] }).read("primary").maxTimeMS(5000);
        const outcome = await storage.recover(entry.name, { confirmed: Boolean(confirmed) });
        if (outcome === "retained") retained++;
        else {
          removed++;
          if (outcome === "staging_removed") stagingRemoved++;
          else discardedOperations++;
        }
      } catch { retained++; failed++; }
    }
  } finally { recovering = false; }
  return { scanned, removed, stagingRemoved, discardedOperations, retained, failed };
}
export function startAttachmentRecovery() {
  if (process.env.MESSAGE_ATTACHMENTS_ENABLED !== "true") return () => {};
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const result = await recoverAttachmentOrphans();
      if (result.failed) console.warn("Some attachment recovery operations failed; tracking was retained.");
    } catch { console.warn("Attachment recovery could not run; no cleanup success was recorded."); }
    finally { running = false; }
  }, 900000);
  timer.unref?.();
  return () => clearInterval(timer);
}
