import multer from "multer";

export const MAX_BLOG_COVER_BYTES = 10 * 1024 * 1024;
const parser = multer({ storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BLOG_COVER_BYTES, files: 1, fields: 6, parts: 8, fieldSize: 512 * 1024 },
  fileFilter(req, file, callback) {
    const matches = file.mimetype === "image/png" ? /\.png$/i.test(file.originalname) : file.mimetype === "image/jpeg" && /\.jpe?g$/i.test(file.originalname);
    callback(matches ? null : new Error("Choose a JPEG or PNG cover image."), Boolean(matches));
  },
}).single("coverImage");
export function blogCoverUpload(req, res, next) {
  parser(req, res, error => error ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: "Choose one JPEG or PNG cover image up to 10 MiB and bounded blog fields." }) : next());
}
