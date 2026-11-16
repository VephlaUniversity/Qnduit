export const MAX_PORTFOLIO_COVER_BYTES = 5 * 1024 * 1024;
export const PORTFOLIO_COVER_FOLDER = "qnduit/portfolio-covers";
export const PORTFOLIO_COVER_HELP = "Choose one JPG or PNG up to 5 MiB, 16 megapixels and 8192 pixels per side.";

export function portfolioCoverTypeError(file) {
  const name = file?.originalname ?? file?.name ?? "";
  const type = file?.mimetype ?? file?.type ?? "";
  return !/\.(jpe?g|png)$/i.test(name) || !["image/jpeg", "image/png"].includes(type)
    || /\.png$/i.test(name) !== (type === "image/png") ? PORTFOLIO_COVER_HELP : "";
}
export function portfolioCoverFileError(file) {
  return !file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PORTFOLIO_COVER_BYTES
    ? PORTFOLIO_COVER_HELP : portfolioCoverTypeError(file);
}
export function ownedPortfolioCover(cover, owner) {
  return typeof cover?.public_id === "string"
    && new RegExp(`^${PORTFOLIO_COVER_FOLDER}/${String(owner)}-[a-f0-9-]{36}$`, "i").test(cover.public_id);
}
