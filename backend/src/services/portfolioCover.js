import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { uploadPortfolioAsset, validatePortfolioImageBytes } from "../utils/portfolioGallery.js";
import { portfolioCoverFileError, PORTFOLIO_COVER_FOLDER } from "../config/portfolioCover.js";

export const coverFailure = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export async function processPortfolioCover(file) {
  const message = portfolioCoverFileError(file);
  if (message) throw coverFailure(message);
  await validatePortfolioImageBytes([file]);
  try {
    const result = await sharp(file.buffer, { limitInputPixels: 16_000_000, failOn: "warning" }).autoOrient()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .toColourspace("srgb").webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    return { buffer: result.data, width: result.info.width, height: result.info.height };
  } catch { throw coverFailure("This cover could not be processed. Choose an intact JPG or PNG."); }
}
export const portfolioCoverStorage = {
  async upload(processed, owner, track) {
    const asset = await uploadPortfolioAsset({ buffer: processed.buffer },
      { owner, folder: PORTFOLIO_COVER_FOLDER }, track);
    return { ...asset, width: processed.width, height: processed.height };
  },
  async cleanup(asset) {
    if (!asset?.public_id?.startsWith(`${PORTFOLIO_COVER_FOLDER}/`)) return;
    try { await cloudinary.uploader.destroy(asset.public_id, { resource_type: "image", invalidate: true, timeout: 10000 }); }
    catch { console.warn("An unused portfolio cover could not be cleaned up."); }
  },
};
