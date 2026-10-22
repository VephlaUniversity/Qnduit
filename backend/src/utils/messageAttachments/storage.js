import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { mkdir, realpath, lstat, rm, writeFile, readFile, rename } from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";

export const attachmentError = (message, status = 400) => Object.assign(new Error(message), { status });

const extensionFor = name => {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
    throw attachmentError("Unsupported attachment extension.");
  }
  return ext;
};

export async function cloudAttachmentStorage() {
  if (process.env.MESSAGE_ATTACHMENTS_ENABLED !== "true") {
    throw attachmentError("Message attachments are disabled.", 503);
  }
  if (process.env.MESSAGE_ATTACHMENT_STORAGE !== "cloudinary" || !path.isAbsolute(process.env.MESSAGE_ATTACHMENT_DIR || "")) {
    throw attachmentError("Cloudinary attachment storage or temporary staging is not configured.", 503);
  }
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw attachmentError("Cloudinary credentials are not configured.", 503);
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  const configured = path.resolve(process.env.MESSAGE_ATTACHMENT_DIR);
  const repo = fileURLToPath(new URL("../../../../", import.meta.url));
  const repoPath = path.resolve(repo);
  if (configured === repoPath || configured.startsWith(repoPath + path.sep)) {
    throw attachmentError("Temporary attachment staging must be outside the application directory.", 503);
  }

  await mkdir(configured, { recursive: true, mode: 0o700 });
  const root = await realpath(configured);
  const stat = await lstat(configured);
  if (stat.isSymbolicLink() || !stat.isDirectory() || (stat.mode & 0o077) || root === repoPath || root.startsWith(repoPath + path.sep)) {
    throw attachmentError("Temporary attachment staging is not safely configured.", 503);
  }

  const validDirectory = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
  const folderPath = async directory => {
    if (!validDirectory(directory)) throw attachmentError("Invalid attachment staging reference.");
    const folder = path.join(root, directory);
    const info = await lstat(folder);
    if (!info.isDirectory() || info.isSymbolicLink()) throw attachmentError("Unsafe attachment staging directory.");
    return folder;
  };
  const readIntent = async directory => {
    const folder = await folderPath(directory);
    const file = path.join(folder, "intent.json");
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 8192) throw attachmentError("Attachment tracking is unavailable.", 503);
    const intent = JSON.parse(await readFile(file, "utf8"));
    if (!/^[a-f\d]{24}$/.test(intent.messageId) || !Number.isFinite(intent.createdAt)) throw attachmentError("Attachment tracking is unavailable.", 503);
    const trackingAvailable = intent.version === 1 && ["open", "uncertain", "discardable"].includes(intent.state) &&
      Array.isArray(intent.assets) && intent.assets.length <= 5 && intent.assets.every(asset =>
        typeof asset.publicId === "string" && asset.publicId.startsWith(`message-attachments/${directory}/`) &&
        /^message-attachments\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|pdf)$/.test(asset.publicId) &&
        ["pending", "uploaded"].includes(asset.state));
    return { ...intent, trackingAvailable };
  };
  const writeIntent = async (directory, intent) => {
    const folder = await folderPath(directory);
    const temporary = path.join(folder, `intent-${randomUUID()}.tmp`);
    const record = { ...intent };
    delete record.trackingAvailable;
    await writeFile(temporary, JSON.stringify(record), { mode: 0o600, flag: "wx" });
    await rename(temporary, path.join(folder, "intent.json"));
  };
  const cleanupLocal = async directory => {
    await folderPath(directory);
    await rm(path.join(root, directory), { recursive: true });
  };
  const discard = async directory => {
    const intent = await readIntent(directory);
    if (!intent.trackingAvailable || intent.state === "uncertain" || intent.assets.some(asset => asset.state === "pending")) {
      throw attachmentError("Attachment cleanup is deferred because the operation outcome is uncertain.", 503);
    }
    // Only a settled, explicitly failed operation can become recoverable. Age is
    // never permission to delete an open operation's assets.
    intent.state = "discardable";
    await writeIntent(directory, intent);
    const outcomes = await Promise.allSettled(intent.assets.map(asset =>
      cloudinary.uploader.destroy(asset.publicId, { resource_type: "raw", type: "authenticated", invalidate: true })
    ));
    if (outcomes.some(result => result.status === "rejected" || !["ok", "not found"].includes(result.value?.result))) {
      throw attachmentError("Attachment cleanup did not complete; tracking was retained for retry.", 503);
    }
    await cleanupLocal(directory);
  };

  return {
    root, readIntent, cleanupLocal, discard,
    async recover(directory, { confirmed }) {
      if (confirmed) { await cleanupLocal(directory); return "staging_removed"; }
      const intent = await readIntent(directory);
      if (!intent.trackingAvailable || intent.state !== "discardable") return "retained";
      await discard(directory);
      return "assets_and_staging_removed";
    },
    async begin(messageId) {
      const directory = randomUUID();
      const folder = path.join(root, directory);
      await mkdir(folder, { mode: 0o700 });
      try {
        await writeIntent(directory, { version: 1, messageId, createdAt: Date.now(), state: "open", assets: [] });
      } catch (error) {
        await rm(folder, { recursive: true, force: true });
        throw error;
      }
      return directory;
    },
    path(directory, name) {
      if (!validDirectory(directory) || typeof name !== "string" || !/^[a-f0-9-]{36}$/.test(name)) {
        throw attachmentError("Invalid temporary attachment reference.");
      }
      return path.join(root, directory, name);
    },
    async upload(directory, filePath, originalName) {
      const intent = await readIntent(directory);
      if (!intent.trackingAvailable || intent.state !== "open" || intent.assets.length >= 5) throw attachmentError("Invalid upload session.");
      const ext = extensionFor(originalName);
      const publicId = `message-attachments/${directory}/${randomUUID()}${ext}`;
      const asset = { publicId, state: "pending" };
      intent.assets.push(asset);
      // Persist the generated identity before asking the provider to create it.
      await writeIntent(directory, intent);
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: "raw", type: "authenticated", public_id: publicId,
          overwrite: false, unique_filename: false, use_filename: false, invalidate: false,
        });
        if (result.public_id !== publicId) throw attachmentError("Unexpected attachment storage response.", 503);
        asset.state = "uploaded";
        await writeIntent(directory, intent);
        return publicId;
      } catch (error) {
        intent.state = "uncertain";
        await writeIntent(directory, intent).catch(() => {});
        throw error;
      }
    },
    async downloadUrl(storageKey, mime) {
      if (typeof storageKey !== "string" || !/^message-attachments\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|pdf)$/i.test(storageKey)) {
        throw attachmentError("Attachment unavailable.", 404);
      }
      const formats = {
        "image/jpeg": storageKey.toLowerCase().endsWith(".jpeg") ? "jpeg" : "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
      };
      const format = formats[mime];
      if (!format || !storageKey.toLowerCase().endsWith(`.${format}`) && !(format === "jpg" && storageKey.toLowerCase().endsWith(".jpeg"))) {
        throw attachmentError("Attachment unavailable.", 404);
      }
      return cloudinary.utils.private_download_url(storageKey, format, {
        resource_type: "raw",
        type: "authenticated",
        expires_at: Math.floor(Date.now() / 1000) + 60,
        attachment: true,
      });
    },
  };
}
