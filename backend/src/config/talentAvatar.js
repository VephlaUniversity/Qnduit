export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_EDGE = 1024;
export const MAX_AVATAR_PIXELS = 40_000_000;
export const AVATAR_QUALITY = 82;
export const AVATAR_SIZE_ERROR = "Choose a profile picture of 10 MiB or smaller.";
export const AVATAR_TYPE_ERROR = "Choose a JPG, JPEG or PNG profile picture.";

// Shared client/server input policy. Decode/processing remains authoritative on
// the server; browser MIME and file extensions alone never establish validity.
export function avatarFileError(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) return "Choose a non-empty JPG or PNG profile picture.";
  if (file.size > MAX_AVATAR_BYTES) return AVATAR_SIZE_ERROR;
  const name = file.originalname ?? file.name ?? "", mime = file.mimetype ?? file.type ?? "";
  if (!/\.(jpe?g|png)$/i.test(name) || !["image/jpeg", "image/png"].includes(mime)) return AVATAR_TYPE_ERROR;
  if (/\.png$/i.test(name) !== (mime === "image/png")) return "The picture's file type does not match its name. Choose a JPG or PNG image.";
  return "";
}
export function avatarHeaderError(bytes, mime) {
  const png = bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png" ? !png : !jpeg) return "This file is not a valid JPG or PNG picture. Choose another image.";
  if (png) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(16) * view.getUint32(20) > MAX_AVATAR_PIXELS) return "This picture is too large to process. Choose an image with 40 megapixels or fewer.";
  }
  return "";
}
