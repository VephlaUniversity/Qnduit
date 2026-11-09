import sharp from "sharp";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import cloudinary from "../utils/cloudinary.js";
import { MAX_BLOG_COVER_BYTES } from "../middleware/blogCoverUpload.js";
import { blogFailure, blogImageUrl } from "../utils/blogValidation.js";

export async function processBlogCover(file) {
  const bytes = file?.buffer;
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BLOG_COVER_BYTES || bytes.length !== file.size) throw blogFailure(400, "Choose a non-empty JPEG or PNG cover up to 10 MiB.");
  const png = file.mimetype === "image/png" && /\.png$/i.test(file.originalname) && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = file.mimetype === "image/jpeg" && /\.jpe?g$/i.test(file.originalname) && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  if (!png && !jpeg) throw blogFailure(400, "The cover must be a valid JPEG or PNG image.");
  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== (png ? "png" : "jpeg") || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1) throw Error("Unsupported image");
    return await image.autoOrient().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).toColourspace("srgb").png().toBuffer();
  } catch { throw blogFailure(400, "Choose an intact, still JPEG or PNG image of at most 40 megapixels."); }
}
export function createBlogCoverStorage(provider = cloudinary) {
  return {
    async upload(buffer, asset) {
      asset.public_id = `qnduit/blog-covers/${randomUUID()}`;
      await new Promise((resolve, reject) => {
        let stream;
        try {
          stream = provider.uploader.upload_stream({ public_id: asset.public_id, resource_type: "image", format: "png", overwrite: false, timeout: 30000 }, (error, result) => {
            if (error || result?.public_id !== asset.public_id || !blogImageUrl(result?.secure_url)) return reject(blogFailure(502, "The cover upload could not be confirmed. Please try again."));
            asset.url = result.secure_url; resolve();
          });
          stream.on("error", () => reject(blogFailure(502, "The cover upload failed.")));
          stream.end(buffer);
        } catch { reject(blogFailure(502, "The cover upload failed.")); }
      });
      return { url: asset.url, public_id: asset.public_id };
    },
    async cleanup(asset) {
      if (!asset?.public_id) return;
      try { await provider.uploader.destroy(asset.public_id, { resource_type: "image", invalidate: true, timeout: 10000 }); }
      catch { console.warn("An unused blog cover could not be cleaned up."); }
    },
  };
}
export const blogCoverStorage = createBlogCoverStorage();
