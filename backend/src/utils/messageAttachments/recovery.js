import process from "node:process";
import { opendir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import Message from "../../models/Message.js";
import { localAttachmentStorage } from "./storage.js";
import { activeAttachmentUploads } from "./ingest.js";

let directoryScan, scanRoot, recovering = false;

// Ambiguous saves are retained until a primary read can confirm message existence.
// Never prune on DB errors, and never remove any folder referenced by a message.
export async function recoverAttachmentOrphans({ olderThanMs = 86400000, limit = 50 } = {}) {
  if (!Number.isFinite(olderThanMs) || olderThanMs < 120000 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid recovery bounds');
  if (recovering) return { scanned: 0, removed: 0 };
  recovering = true;
  let scanned = 0, removed = 0;
  try {
    const storage = await localAttachmentStorage();
    if (!directoryScan || scanRoot !== storage.root) {
      await directoryScan?.close();
      directoryScan = await opendir(storage.root); scanRoot = storage.root;
    }
    while (scanned < 200 && removed < limit) {
      const entry = await directoryScan.read();
      if (!entry) { await directoryScan.close(); directoryScan = null; break; }
      scanned++;
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name) || activeAttachmentUploads.has(entry.name)) continue;
      const intentPath = path.join(storage.root, entry.name, 'intent.json');
      try {
        const stat = await lstat(intentPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256) continue;
        const intent = JSON.parse(await readFile(intentPath, 'utf8'));
        if (!/^[a-f\d]{24}$/.test(intent.messageId) || !Number.isFinite(intent.createdAt) || Date.now() - intent.createdAt < olderThanMs) continue;
        const referenced = await Message.exists({ _id: intent.messageId }).read('primary').maxTimeMS(5000);
        if (!referenced) { await storage.discard(entry.name); removed++; }
      } catch { /* Retain on corrupt intent, missing files, or database uncertainty. */ }
    }
  } finally { recovering = false; }
  return { scanned: Math.min(scanned, 200), removed };
}
export function startAttachmentRecovery() {
  if (process.env.MESSAGE_ATTACHMENTS_ENABLED !== 'true') return () => {};
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await recoverAttachmentOrphans(); } catch { /* Uploads report configuration failures; recovery retries later. */ }
    finally { running = false; }
  }, 900000);
  timer.unref?.();
  return () => clearInterval(timer);
}
