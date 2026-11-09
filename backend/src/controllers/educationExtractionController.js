import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { EDUCATION_MAX_BYTES, extractEducation, educationError } from "../services/educationExtraction.js";
import { attachCvProof } from "../utils/cvImportProof.js";

// Authentication/role checks run before these limits and before reading file bytes.
export const educationExtractionLimit = rateLimit({ windowMs: 60000, limit: 4, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => String(req.user._id),
  message: { success: false, message: "Please wait before extracting another CV." } });
let inflight = 0;
export function educationExtractionCapacity(_req, res, next) {
  // Reserve before buffering multipart bytes: at most two local document buffers.
  if (inflight >= 2) return res.status(429).set("Retry-After", "5").json({ success: false, message: educationError("BUSY").message });
  inflight++;
  const release = () => {
    inflight--; res.removeListener("finish", release); res.removeListener("close", release);
  };
  res.once("finish", release); res.once("close", release); next();
}
const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: EDUCATION_MAX_BYTES, files: 1, fields: 0, parts: 2, fieldNameSize: 40,
} }).single("cv");
export function extractEducationDraft(req, res) {
  res.set("Cache-Control", "private, no-store");
  upload(req, res, async error => {
    if (error) {
      const failure = educationError(error.code === "LIMIT_FILE_SIZE" ? "RESOURCE_LIMIT" : "INVALID_DOCUMENT");
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: failure.message });
    }
    const controller = new AbortController();
    const stop = () => { if (!res.writableEnded) controller.abort(); };
    res.on("close", stop);
    try {
      if (!req.file) throw educationError("INVALID_DOCUMENT");
      const draft = await extractEducation(req.file, { signal: controller.signal });
      draft.entries = draft.entries.map(row => attachCvProof(req.user._id, "education", row));
      draft.education = draft.entries;
      for (const section of ["experience", "skills"]) draft[section] = draft[section].map(row => attachCvProof(req.user._id, section, row));
      if (!controller.signal.aborted) res.json({ success: true, accountId: String(req.user._id), ...draft });
    } catch (failure) {
      // Never log parser diagnostics, file names, document bytes or extracted text.
      const safe = educationError(failure.code || "INVALID_DOCUMENT");
      if (!controller.signal.aborted) res.status(safe.statusCode || 422).json({ success: false, message: safe.message });
    } finally {
      res.removeListener("close", stop);
      if (req.file?.buffer) req.file.buffer.fill(0);
      req.file = undefined;
    }
  });
}
