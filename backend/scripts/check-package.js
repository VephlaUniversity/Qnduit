import { readdir, readFile, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire, isBuiltin } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// Check literal ESM/CommonJS imports without executing application code, loading
// credentials or connecting to services. Startup remains a separate smoke test.
const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const inside = file => file === root || file.startsWith(root + path.sep);
async function sources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sources(file));
    else if (entry.isFile() && file.endsWith(".js")) files.push(file);
  }
  return files;
}
const files = [...await sources(path.join(root, "src")), ...await sources(path.join(root, "scripts"))];
let imports = 0;
for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const source = (await readFile(file, "utf8")).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  const specifiers = source.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"]*?\s+from\s*)?|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g);
  const resolve = createRequire(file).resolve;
  for (const [, specifier] of specifiers) {
    if (isBuiltin(specifier)) continue;
    const label = `${path.relative(root, file)}: ${specifier}`;
    try {
      const resolved = await realpath(resolve(specifier));
      if (!inside(resolved)) throw new Error("dependency is outside the backend package");
    } catch (error) {
      throw new Error(`Backend packaging check failed (${label}): ${error.message}`, { cause: error });
    }
    imports++;
  }
}
console.log(`Backend packaging check passed: ${files.length} JavaScript files, ${imports} imports resolved inside backend/.`);
