import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { mkdir, realpath, lstat, rm, writeFile } from "node:fs/promises";
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

  // Uploaded asset references are tracked per request so failed sends can remove cloud orphans.
  const uploadedByDirectory = new Map();
  const validDirectory = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);

  return {
    root,
    async begin(messageId) {
      const directory = randomUUID();
      const folder = path.join(root, directory);
      await mkdir(folder, { mode: 0o700 });
      try {
        await writeFile(path.join(folder, "intent.json"), JSON.stringify({ messageId, createdAt: Date.now() }), { mode: 0o600, flag: "wx" });
      } catch (error) {
        await rm(folder, { recursive: true, force: true });
        throw error;
      }
      uploadedByDirectory.set(directory, new Set());
      return directory;
    },
    path(directory, name) {
      if (!validDirectory(directory) || typeof name !== "string" || !/^[a-f0-9-]{36}$/.test(name)) {
        throw attachmentError("Invalid temporary attachment reference.");
      }
      return path.join(root, directory, name);
    },
    async upload(directory, filePath, originalName) {
      if (!validDirectory(directory) || !uploadedByDirectory.has(directory)) throw attachmentError("Invalid upload session.");
      const ext = extensionFor(originalName);
      // Raw assets retain their file extension in the public ID. 'authenticated' prevents public delivery.
      const publicId = `message-attachments/${directory}/${randomUUID()}${ext}`;
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "raw",
        type: "authenticated",
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        invalidate: false,
      });
      uploadedByDirectory.get(directory).add(result.public_id);
      return result.public_id;
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
    async cleanupLocal(directory) {
      if (!validDirectory(directory)) return;
      await rm(path.join(root, directory), { recursive: true, force: true });
      uploadedByDirectory.delete(directory);
    },
    async discard(directory) {
      if (!validDirectory(directory)) throw attachmentError("Invalid storage reference.");
      const publicIds = [...(uploadedByDirectory.get(directory) || [])];
      // Best effort deletion: attempt every asset even if one deletion fails.
      const outcomes = await Promise.allSettled(publicIds.map(publicId =>
        cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true })
      ));
      await rm(path.join(root, directory), { recursive: true, force: true });
      uploadedByDirectory.delete(directory);
      if (outcomes.some(result => result.status === "rejected" || result.value?.result === "error")) {
        throw attachmentError("Some temporary Cloudinary attachments could not be deleted.", 503);
      }
    },
  };
}
