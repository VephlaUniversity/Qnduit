import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, realpath, lstat, open, rm, writeFile } from "node:fs/promises";

export const attachmentError = (message, status = 400) => Object.assign(new Error(message), { status });
export async function localAttachmentStorage() {
  if (process.env.MESSAGE_ATTACHMENTS_ENABLED !== "true") throw attachmentError("Message attachments are disabled.", 503);
  if (process.env.MESSAGE_ATTACHMENT_STORAGE !== "local" || !path.isAbsolute(process.env.MESSAGE_ATTACHMENT_DIR || "")) {
    throw attachmentError("Private attachment storage is not configured.", 503);
  }
  const configured = path.resolve(process.env.MESSAGE_ATTACHMENT_DIR);
  const repo = fileURLToPath(new URL("../../../../", import.meta.url));
  if (configured === path.resolve(repo) || configured.startsWith(path.resolve(repo) + path.sep)) {
    throw attachmentError("Private attachment storage must be outside the application directory.", 503);
  }
  await mkdir(configured, { recursive: true, mode: 0o700 });
  const root = await realpath(configured);
  const stat = await lstat(configured);
  if (stat.isSymbolicLink() || !stat.isDirectory() || stat.mode & 0o077 || root === path.resolve(repo) || root.startsWith(path.resolve(repo) + path.sep)) {
    throw attachmentError("Private attachment storage is not safely configured.", 503);
  }
  const validKey = key => typeof key === "string" && /^[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key);
  return {
    root,
    async begin(messageId) {
      const directory = randomUUID();
      await mkdir(path.join(root, directory), { mode: 0o700 });
      try {
        await writeFile(path.join(root, directory, 'intent.json'), JSON.stringify({ messageId, createdAt: Date.now() }), { mode: 0o600, flag: "wx" });
      } catch (error) { await rm(path.join(root, directory), { recursive: true, force: true }); throw error; }
      return directory;
    },
    path(directory, name) {
      const key = `${directory}/${name}`;
      if (!validKey(key)) throw attachmentError("Invalid attachment reference.");
      return path.join(root, key);
    },
    async read(key) {
      if (!validKey(key)) throw attachmentError("Attachment unavailable.", 404);
      const directory = path.dirname(key);
      if ((await lstat(path.join(root, directory))).isSymbolicLink()) throw attachmentError("Attachment unavailable.", 404);
      const handle = await open(path.join(root, key), constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await handle.stat();
      if (!stat.isFile()) { await handle.close(); throw attachmentError("Attachment unavailable.", 404); }
      return { handle, size: stat.size };
    },
    async discard(directory) {
      if (!/^[a-f0-9-]{36}$/.test(directory)) throw attachmentError("Invalid storage reference.");
      await rm(path.join(root, directory), { recursive: true, force: true });
    },
  };
}
