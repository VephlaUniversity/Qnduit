import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

export function isWithinDirectory(candidate, directory) {
  const relative = path.relative(directory, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

export async function applicationDirectory(storageModuleUrl) {
  // storage.js is always three directories below the backend package root,
  // including when that package alone is deployed at /app.
  const backend = path.resolve(fileURLToPath(new URL("../../../", storageModuleUrl)));
  const parent = path.dirname(backend);
  if (path.basename(backend) === "backend") {
    try {
      // Preserve the wider exclusion for the repository's frontend + backend.
      if ((await stat(path.join(parent, "package.json"))).isFile()) return parent;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return backend;
}
