import { createHash } from "node:crypto";
import path from "node:path";
import { readFile, mkdir, writeFile, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { cloudAttachmentStorage } from "../../src/utils/messageAttachments/storage.js";

// Test harness only: private-storage intent/staging logic is real; provider
// transport is replaced in memory. Nothing imports this in application startup.
export function mockSupportStorage(directory, durableDirectory) {
  const assets = new Map(), stats = { uploads: 0, destroys: 0, opens: 0, failUpload: false, delay: 0 };
  const privatePath = key => path.join(durableDirectory, `${createHash("sha256").update(key).digest("hex")}.jpg`);
  const originalUpload = cloudinary.uploader.upload, originalDestroy = cloudinary.uploader.destroy;
  process.env.CLOUDINARY_CLOUD_NAME = "synthetic-only"; process.env.CLOUDINARY_API_KEY = "synthetic-only"; process.env.CLOUDINARY_API_SECRET = "synthetic-only";
  cloudinary.uploader.upload = async (file, options) => {
    stats.uploads++; if (stats.delay) await new Promise(resolve => setTimeout(resolve, stats.delay));
    const bytes = await readFile(file);
    assets.set(options.public_id, bytes);
    if (durableDirectory) { await mkdir(durableDirectory, { recursive: true, mode: 0o700 }); await writeFile(privatePath(options.public_id), bytes, { mode: 0o600 }); }
    if (stats.failUpload) throw Error("Mock uncertain provider result");
    return { public_id: options.public_id };
  };
  cloudinary.uploader.destroy = async key => { stats.destroys++; assets.delete(key); if (durableDirectory) await unlink(privatePath(key)).catch(() => {}); return { result: "ok" }; };
  return { assets, stats, restore() { cloudinary.uploader.upload = originalUpload; cloudinary.uploader.destroy = originalDestroy; },
    async storageFactory() {
      const storage = await cloudAttachmentStorage({ enabled: "true", provider: "cloudinary", directory });
      return { ...storage, async open(file) { stats.opens++; const bytes = assets.get(file.storageKey) || (durableDirectory ? await readFile(privatePath(file.storageKey)).catch(() => null) : null); if (!bytes) throw Error("Mock asset unavailable"); return Readable.from(bytes); } };
    } };
}
