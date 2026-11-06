import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import Talent from "../models/Talent.js";
import cloudinary from "../utils/cloudinary.js";
import { OWNER_TALENT_FIELDS } from "../utils/ownerTalentProfile.js";
import { MAX_AVATAR_BYTES, MAX_AVATAR_EDGE, MAX_AVATAR_PIXELS, AVATAR_QUALITY, AVATAR_SIZE_ERROR, avatarFileError, avatarHeaderError } from "../config/talentAvatar.js";

export const avatarError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
function intactContainer(bytes, mime) {
  if (mime === "image/jpeg") return bytes.at(-2) === 255 && bytes.at(-1) === 217;
  let offset = 8, first = true;
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.toString("ascii", offset + 4, offset + 8);
    if (size > bytes.length - offset - 12 || first && (type !== "IHDR" || size !== 13) || type === "acTL") return false;
    if (crc32(bytes.subarray(offset + 4, offset + 8 + size)) !== bytes.readUInt32BE(offset + 8 + size)) return false;
    offset += size + 12; first = false;
    if (type === "IEND") return size === 0 && offset === bytes.length;
  }
  return false;
}
export const avatarProcessor = {
  async process(file) {
    const bytes = file?.buffer;
    const validation = avatarFileError(file);
    if (validation) throw avatarError(validation, file?.size > MAX_AVATAR_BYTES ? 413 : 400);
    if (!Buffer.isBuffer(bytes) || bytes.length !== file.size || !bytes.length) throw avatarError("This picture could not be read. Choose another JPG or PNG.");
    if (bytes.length > MAX_AVATAR_BYTES) throw avatarError(AVATAR_SIZE_ERROR, 413);
    const header = avatarHeaderError(bytes, file.mimetype);
    if (header || !intactContainer(bytes, file.mimetype)) throw avatarError(header || "This picture is corrupt or unsupported. Choose an intact, still JPG or PNG image.");
    try {
      const image = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_AVATAR_PIXELS });
      const metadata = await image.metadata();
      if (metadata.format !== (file.mimetype === "image/png" ? "png" : "jpeg") || !metadata.width || !metadata.height || (metadata.pages || 1) !== 1) throw Error("Unsupported image");
      const result = await image.autoOrient().resize({ width: MAX_AVATAR_EDGE, height: MAX_AVATAR_EDGE, fit: "inside", withoutEnlargement: true })
        .toColourspace("srgb").webp({ quality: AVATAR_QUALITY, effort: 4 }).toBuffer({ resolveWithObject: true });
      return { buffer: result.data, width: result.info.width, height: result.info.height, format: result.info.format, size: result.data.length };
    } catch { throw avatarError("This picture could not be processed. Choose an intact JPG or PNG image with 40 megapixels or fewer."); }
  },
};
export function allocateTalentAvatar(id) {
  const name = `${id}-${randomUUID()}`;
  return { public_id: `qnduit/talent-avatars/${name}`, name };
}
export async function uploadTalentAvatar(asset, bytes) {
  await new Promise((resolve, reject) => {
    let stream;
    try { stream = cloudinary.uploader.upload_stream({ folder: "qnduit/talent-avatars", public_id: asset.name, resource_type: "image", format: "webp", overwrite: false, timeout: 30000 }, (error, result) => {
      if (error) return reject(avatarError("We couldn’t upload your picture. Your saved picture is unchanged. Please try again.", 502));
      try {
        // Only IDs allocated by this operation may ever be cleaned up.
        if (![asset.public_id, asset.name].includes(result?.public_id)) throw Error("Unexpected media identity");
        asset.public_id = result.public_id;
        const url = new URL(result.secure_url);
        if (url.protocol !== "https:" || url.username || url.password) throw Error("Invalid media URL");
        asset.url = url.href;
        resolve();
      } catch { reject(avatarError("We couldn’t verify the uploaded picture. Your saved picture is unchanged. Please try again.", 502)); }
    }); } catch { return reject(avatarError("We couldn’t upload your picture. Your saved picture is unchanged. Please try again.", 502)); }
    stream.on("error", () => reject(avatarError("We couldn’t upload your picture. Your saved picture is unchanged. Please try again.", 502)));
    stream.end(bytes);
  });
}
export async function cleanupTalentAvatar(asset) {
  if (!asset) return;
  try { await cloudinary.uploader.destroy(asset.public_id, { resource_type: "image", invalidate: true, timeout: 10000 }); }
  catch { console.warn("An unused new Talent avatar could not be cleaned up."); }
}
const matches = (record, asset) => record?.avatar?.public_id === asset.public_id && record.avatar.url === asset.url;
export async function persistTalentAvatar(id, previous, updates, asset) {
  try {
    const talent = await Talent.findOneAndUpdate({ _id: id,
      "avatar.url": previous.avatar?.url ?? null, "avatar.public_id": previous.avatar?.public_id ?? null,
    }, updates, { new: true, runValidators: true, context: "query", omitUndefined: true, writeConcern: { w: "majority" } }).select(OWNER_TALENT_FIELDS);
    if (!talent) throw Object.assign(avatarError("Your profile picture changed in another session. Reload before replacing it.", 409), { definiteAvatarFailure: true });
    return matches(talent, asset) ? { talent } : { pending: true };
  } catch (error) {
    if (error.definiteAvatarFailure || ["ValidationError", "CastError", "StrictModeError"].includes(error.name)) {
      error.definiteAvatarFailure = true;
      throw error;
    }
    // An error/old record cannot prove an in-flight write won't commit later.
    // Confirm only an exact majority-visible new asset; otherwise retain it.
    try {
      const projection = Object.fromEntries(OWNER_TALENT_FIELDS.split(" ").map(key => [key, 1]));
      const current = await Talent.collection.findOne({ _id: id }, { projection, readConcern: { level: "majority" } });
      if (matches(current, asset)) return { talent: current };
    } catch { /* Unreadable outcomes retain the newly uploaded asset. */ }
    return { pending: true };
  }
}
