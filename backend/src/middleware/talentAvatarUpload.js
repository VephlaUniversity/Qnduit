import { Buffer } from "node:buffer";
import multer from "multer";
import path from "node:path";
import { MAX_AVATAR_BYTES, AVATAR_SIZE_ERROR, AVATAR_TYPE_ERROR } from "../config/talentAvatar.js";

const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const memory = multer.memoryStorage();
// Bound avatar memory while streaming. Do not impose the avatar limit on the
// existing introVideo field, or change other media/attachment upload pipelines.
const storage = {
  _handleFile(req, file, callback) {
    if (file.fieldname !== "avatar") return memory._handleFile(req, file, callback);
    let size = 0, chunks = [], finished = false;
    const done = (failure, result) => { if (finished) return; finished = true; callback(failure, result); };
    file.stream.on("data", chunk => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_AVATAR_BYTES) { chunks = []; done(error(AVATAR_SIZE_ERROR, 413)); }
      else chunks.push(chunk);
    });
    file.stream.once("error", done);
    file.stream.once("end", () => done(null, { buffer: Buffer.concat(chunks), size }));
  },
  _removeFile(req, file, callback) { delete file.buffer; callback(null); },
};
export const talentUpload = multer({
  storage,
  fileFilter(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === "avatar") {
      if (![".png", ".jpg", ".jpeg"].includes(ext) || !["image/jpeg", "image/png"].includes(file.mimetype)) return callback(error(AVATAR_TYPE_ERROR));
    } else if (![".png", ".jpg", ".jpeg", ".mp4"].includes(ext)) return callback(new Error("Only images and mp4 allowed"));
    callback(null, true);
  },
});
