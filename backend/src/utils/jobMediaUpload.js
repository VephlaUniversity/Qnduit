import cloudinary from "./cloudinary.js";

const uploadBuffer = (file, folder, type) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: type },
    (error, result) => {
      if (error) { reject(error); return; }
      try {
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

export async function uploadJobMedia(files = {}) {
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
    media.featuredImage = await uploadBuffer(files.featuredImage[0], "qnduit/job-featured-images", "image");
  }
  if (files.photos) {
    media.gallery = [];
    for (const file of files.photos) {
      const type = file.mimetype.startsWith("video") ? "video" : "image";
      const uploaded = await uploadBuffer(file, "qnduit/job-gallery", type);
      media.gallery.push({ ...uploaded, type });
    }
  }
  return media;
}
