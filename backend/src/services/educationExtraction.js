import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { mapEducationEvidence } from "../utils/educationEvidence.js";
import { mapOtherCvEvidence } from "../utils/cvEvidence.js";

export const EDUCATION_MAX_BYTES = 10 * 1024 * 1024;
const worker = fileURLToPath(new URL("./education/nodeParserWorker.js", import.meta.url));
const guard = fileURLToPath(new URL("./education/nodeNetworkGuard.js", import.meta.url));
const messages = {
  UNSUPPORTED_FORMAT: "CV auto-fill supports text-based PDF and DOCX. You can still upload this file or enter details manually.",
  INVALID_DOCUMENT: "This file could not be read safely. Choose a valid PDF or DOCX, or enter details manually.",
  ENCRYPTED_PDF: "Encrypted PDFs cannot be extracted. Use an unencrypted text-based PDF or enter details manually.",
  SCANNED_PDF: "This PDF has no readable text. You can still save the CV and enter details manually.",
  UNSUPPORTED_LAYOUT: "The text order on this CV cannot be read reliably. You can still save the CV and enter details manually.",
  RESOURCE_LIMIT: "This document exceeds extraction limits. Use a smaller CV with shorter paragraphs, or enter details manually.",
  ISOLATION_UNAVAILABLE: "CV auto-fill is temporarily unavailable. You can still upload a CV and enter details manually.",
  BUSY: "CV auto-fill is busy. Please try again shortly.",
};
export const educationError = code => Object.assign(new Error(messages[code] || messages.INVALID_DOCUMENT), {
  code, statusCode: code === "BUSY" ? 429 : code === "ISOLATION_UNAVAILABLE" ? 503 : 422,
});

let active = 0;
export async function extractEducation(file, { signal } = {}) {
  const extension = path.extname(file?.originalname || "").toLowerCase();
  if (![".pdf", ".docx"].includes(extension)) throw educationError("UNSUPPORTED_FORMAT");
  if (!file?.buffer?.length || file.buffer.length > EDUCATION_MAX_BYTES) throw educationError("RESOURCE_LIMIT");
  const kind = extension.slice(1), bytes = file.buffer;
  if (kind === "pdf" ? bytes.subarray(0, 5).toString() !== "%PDF-" : !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    throw educationError("INVALID_DOCUMENT");
  }
  if (!["darwin", "linux"].includes(process.platform)) throw educationError("ISOLATION_UNAVAILABLE");
  if (active >= 2) throw educationError("BUSY");
  active++;
  try {
    const result = await new Promise((resolve, reject) => {
      // A disposable Node process has bounded heap and receives no application
      // credentials. macOS also applies a kernel network/write/fork policy.
      const profile = "(version 1)(allow default)(deny network*)(deny file-write*)(deny process-fork)";
      const nodeArgs = ["--max-old-space-size=256", "--permission",
        `--allow-fs-read=${path.dirname(worker)}`,
        `--allow-fs-read=${path.resolve(path.dirname(worker), "../../../node_modules")}`,
        "--import", guard, worker, kind];
      const command = process.platform === "darwin" ? "/usr/bin/sandbox-exec" : process.execPath;
      const args = process.platform === "darwin" ? ["-p", profile, process.execPath, ...nodeArgs] : nodeArgs;
      const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], cwd: path.dirname(worker),
        env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", HOME: "/nonexistent" } });
      let output = [], size = 0, settled = false, rssTimer;
      const finish = (error, value) => {
        if (settled) return;
        settled = true; clearTimeout(timer); clearInterval(rssTimer); signal?.removeEventListener("abort", cancel);
        if (error) { child.kill("SIGKILL"); reject(error); } else resolve(value);
      };
      const cancel = () => finish(educationError("RESOURCE_LIMIT"));
      const timer = setTimeout(cancel, 10000);
      if (process.platform === "linux") rssTimer = setInterval(async () => {
        try {
          const status = await readFile(`/proc/${child.pid}/status`, "utf8");
          const residentKb = Number(status.match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1] || 0);
          if (residentKb > 384 * 1024) cancel();
        } catch { /* A process that has exited will be handled by close. */ }
      }, 50);
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel();
      child.on("error", () => finish(educationError("ISOLATION_UNAVAILABLE")));
      child.stdin.on("error", () => {});
      child.stdout.on("data", chunk => {
        size += chunk.length;
        if (size > 1024 * 1024) finish(educationError("RESOURCE_LIMIT")); else output.push(chunk);
      });
      child.stderr.on("data", () => {}); // Never forward parser text or document contents.
      child.on("close", code => {
        if (settled) return;
        if (code !== 0) return finish(educationError(code === 134 ? "RESOURCE_LIMIT" : "ISOLATION_UNAVAILABLE"));
        try {
          const parsed = JSON.parse(Buffer.concat(output).toString("utf8")); output = [];
          if (parsed.error) return finish(educationError(parsed.error));
          if (!Array.isArray(parsed.segments) || parsed.segments.length > 3000) throw Error();
          finish(null, { segments: parsed.segments, omittedPages: parsed.omittedPages || 0 });
        } catch { finish(educationError("INVALID_DOCUMENT")); }
      });
      if (!settled) child.stdin.end(bytes);
    });
    // Bound the literal-field mapping work as well as the isolated parser.
    // Pathological long lines must not make Node's field regexes block requests.
    if (result.segments.some(segment => typeof segment?.text !== "string" || segment.text.length > 2048)) throw educationError("RESOURCE_LIMIT");
    return { ...mapEducationEvidence(result.segments), ...mapOtherCvEvidence(result.segments),
      ...(result.omittedPages ? { partialWarning: "Some pages could not be read reliably. Review these suggestions and enter missing details manually." } : {}) };
  } finally { active--; }
}
