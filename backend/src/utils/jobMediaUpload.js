import { Buffer } from "node:buffer";
import cloudinary from "./cloudinary.js";

const uploadBuffer = (file, folder, type, onUploaded) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: type },
    (error, result) => {
      if (error) { reject(error); return; }
      try {
        if (typeof result?.public_id === "string" && result.public_id.trim()) {
          onUploaded({ public_id: result.public_id, resource_type: type });
        }
        if (typeof result?.secure_url !== "string") throw new Error("Invalid upload result");
        const url = new URL(result.secure_url);
        if (!["https:", "http:"].includes(url.protocol) || typeof result.public_id !== "string" || !result.public_id.trim()) {
          throw new Error("Invalid upload result");
        }
        resolve({ url: result.secure_url, public_id: result.public_id });
      } catch {
        reject(new Error("Unable to upload job media"));
      }
    },
  );
  stream.on("error", reject);
  stream.end(file.buffer);
});

export async function removeNewJobMedia(assets) {
  // Only assets returned by this operation's upload calls may be supplied here.
  const removed = await Promise.all(assets.map(asset => new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 5000);
    const finish = success => { clearTimeout(timer); resolve(success); };
    try {
      cloudinary.uploader.destroy(asset.public_id, { resource_type: asset.resource_type },
        (error, result) => finish(!error && ["ok", "not found"].includes(result?.result)));
    } catch { finish(false); }
  })));
  if (removed.some(success => !success)) console.warn("Some new job media could not be cleaned up after a failed creation.");
}

export async function uploadJobMedia(files = {}, { onUploaded = () => {} } = {}) {
  // Validate every input before starting any uploads. Multer keeps files in memory.
  for (const file of [...(files.featuredImage || []), ...(files.photos || [])]) {
    if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) {
      const error = new Error("Select a non-empty media file.");
      error.name = "ValidationError";
      throw error;
    }
  }
  const media = {};
  if (files.featuredImage) {
    media.featuredImage = await uploadBuffer(files.featuredImage[0], "qnduit/job-featured-images", "image", onUploaded);
  }
  if (files.photos) {
    media.gallery = [];
    for (const file of files.photos) {
      const type = (file.mimetype.startsWith("video") || /\.mp4$/i.test(file.originalname || "")) ? "video" : "image";
      const uploaded = await uploadBuffer(file, "qnduit/job-gallery", type, onUploaded);
      media.gallery.push({ ...uploaded, type });
    }
  }
  return media;
}
