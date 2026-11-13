import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import path from "node:path";
import cloudinary from "./cloudinary.js";
import { publicExternalUrl, publicImageUrl } from "./publicTalentProfile.js";
import { portfolioImageMetadata, portfolioMetadata, validPortfolioImages } from "./portfolioMetadata.js";

export const MAX_PORTFOLIO_REQUEST_BYTES = 30 * 1024 * 1024;
const fail = message => Object.assign(new Error(message), { statusCode: 400 });

// Allocate and track a unique provider ID before sending bytes. A failed upload
// can otherwise leave an asset whose callback never supplied its storage ID.
export async function uploadPortfolioAsset(file, { owner, resourceType = "image", folder }, track) {
  const config = cloudinary.config();
  if (resourceType === "image" && (!config.cloud_name || !config.api_key || !config.api_secret)) {
    throw Object.assign(new Error("Image upload is unavailable. Your draft is safe. Try again later."), { statusCode: 503 });
  }
  const extension = resourceType === "raw" ? path.extname(file.originalname).toLowerCase() : "";
  const asset = { public_id: `${folder}/${owner}-${randomUUID()}${extension}`, resourceType };
  track(asset);
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: asset.public_id, resource_type: resourceType, overwrite: false, timeout: 30000 },
      (error, value) => error ? reject(error) : resolve(value));
    stream.on("error", reject);
    stream.end(file.buffer);
  });
  if (result?.public_id !== asset.public_id || !result?.secure_url?.startsWith("https://")
    || !(resourceType === "image" ? publicImageUrl(result.secure_url) : publicExternalUrl(result.secure_url))) {
    throw new Error("The media upload could not be confirmed.");
  }
  return { url: result.secure_url, public_id: asset.public_id };
}

// One context spans Talent and Resume projects: a file belongs to exactly one
// project/image, and gallery plans never enter a document or request digest.
export function portfolioUploads(files = []) {
  if (files.length > 20) throw fail("Upload at most 20 portfolio images per request.");
  const uploads = new Map();
  let size = 0;
  for (const file of files) {
    if (uploads.has(file.originalname)) throw fail("Duplicate portfolio upload reference.");
    if (file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g)$/i.test(file.originalname)
      || !["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype)) {
      throw fail("Portfolio images must be PNG or JPG, up to 5 MiB each.");
    }
    size += file.size;
    uploads.set(file.originalname, file);
  }
  if (size > MAX_PORTFOLIO_REQUEST_BYTES) throw fail("The combined upload limit is 30 MiB per request.");
  return { uploads, used: new Set(), galleries: new WeakMap() };
}

export function finishPortfolioUploads(context) {
  if (context.used.size !== context.uploads.size) throw fail("Every portfolio upload must reference one project image.");
}

export async function validatePortfolioImageBytes(files) {
  for (const file of files) {
    if (!Buffer.isBuffer(file.buffer) || !file.buffer.length || file.buffer.length !== file.size) throw fail("Choose a non-empty portfolio image.");
    try {
      const decoder = sharp(file.buffer, { limitInputPixels: 16_000_000, failOn: "warning" });
      const info = await decoder.metadata();
      const format = file.mimetype === "image/png" ? "png" : "jpeg";
      if (info.format !== format || !info.width || !info.height || info.width > 8192 || info.height > 8192
        || info.width * info.height > 16_000_000 || (info.pages || 1) !== 1
        || (format === "png") !== /\.png$/i.test(file.originalname)) throw new Error("Invalid image format or dimensions.");
      // Force decoding too: metadata alone accepts some truncated images.
      await decoder.resize(1, 1).raw().toBuffer();
    } catch {
      throw fail("Use a valid PNG or JPEG, up to 16 megapixels and 8192 pixels per side.");
    }
  }
}

const claim = (context, name) => {
  if (typeof name !== "string" || !context.uploads.has(name) || context.used.has(name)) throw fail("Invalid or reused portfolio upload reference.");
  context.used.add(name);
};

export function preparePortfolioProject(input, previous = {}, context = portfolioUploads(), coverUpload) {
  const data = { ...input };
  delete data.images;
  let metadata;
  try { metadata = portfolioMetadata(data, previous); }
  catch (error) { throw fail(error.message); }
  const project = { ...previous, ...metadata };
  if (!Object.hasOwn(input, "images")) {
    if (coverUpload) claim(context, coverUpload);
    return { project, metadata };
  }
  if (!Array.isArray(input.images)) throw fail("Invalid project gallery.");
  const references = [...input.images];
  // The old upload field remains a cover upload and is part of the six-image cap.
  if (coverUpload && !references.some(row => row?.upload === coverUpload)) references.unshift({ upload: coverUpload });
  if (references.length > 6) throw fail("Use at most six images per project, including the cover.");
  const usedIds = new Set();
  const gallery = references.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw fail("Invalid project image reference.");
    if (!Object.hasOwn(row, "upload")) {
      if (usedIds.has(row.id)) throw fail("Duplicate project image reference.");
      usedIds.add(row.id);
      try { return { asset: portfolioMetadata({ images: [row] }, previous).images[0] }; }
      catch (error) { throw fail(error.message); }
    }
    if (Object.keys(row).some(key => !["upload", "alt", "caption", "comparisonLabel"].includes(key))) throw fail("Invalid gallery upload reference.");
    claim(context, row.upload);
    let validated;
    try { validated = { _id: randomUUID(), ...portfolioImageMetadata(row) }; }
    catch (error) { throw fail(error.message); }
    return { upload: row.upload, details: validated };
  });
  // Before uploads, schema validation sees retained assets only. Final validation
  // runs again after every upload has been resolved to a server-owned asset.
  metadata.images = gallery.filter(row => row.asset).map(row => row.asset);
  project.images = metadata.images;
  context.galleries.set(project, gallery);
  return { project, metadata };
}

export function materializePortfolioProject(project, context, uploaded, coverField, coverUpload) {
  const gallery = context.galleries.get(project);
  const result = { ...project };
  if (coverUpload) {
    const cover = uploaded.get(coverUpload);
    if (!cover) throw fail("Portfolio cover upload was not resolved.");
    result[coverField] = cover.url;
    if (coverField === "url") result.public_id = cover.public_id;
  }
  if (gallery) {
    result.images = gallery.map(row => {
      if (row.asset) return row.asset;
      const asset = uploaded.get(row.upload);
      if (!asset) throw fail("Portfolio gallery upload was not resolved.");
      return { ...asset, ...row.details };
    });
    if (!validPortfolioImages(result.images)) throw fail("Invalid resolved portfolio gallery.");
    result[coverField] = result.images[0]?.url || "";
    if (coverField === "url") result.public_id = result.images[0]?.public_id || "";
  }
  return result;
}
