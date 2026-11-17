import multer from "multer";
import { MAX_PORTFOLIO_COVER_BYTES, PORTFOLIO_COVER_HELP, portfolioCoverTypeError } from "../config/portfolioCover.js";

// This middleware runs only after authentication, role, paid entitlement and
// owner/version checks. Bound the single memory buffer and all multipart parts.
const parser = multer({ storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PORTFOLIO_COVER_BYTES, files: 1, fields: 0, parts: 2 },
  fileFilter(req, file, callback) {
    const message = portfolioCoverTypeError(file);
    callback(message ? new Error(message) : null, !message);
  },
}).single("coverImage");
export function portfolioCoverUpload(req, res, next) {
  parser(req, res, error => error ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
    .json({ success: false, message: PORTFOLIO_COVER_HELP }) : next());
}
