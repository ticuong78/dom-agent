/**
 * Post-build path fixer for tsc-alias output.
 *
 * 1. Strips the extra "/src/" segment that tsc-alias produces
 *    (because tsconfig paths use ./src/core/* but rootDir=./src
 *    means dist outputs at dist/core/* directly).
 *
 * 2. Resolves bare directory imports to /index.js for ESM compat
 *    (Node ESM does not support directory imports).
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";

const DIST = join(new URL(".", import.meta.url).pathname, "..", "dist");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(js|d\.ts|d\.ts\.map|js\.map)$/.test(entry.name)) yield full;
  }
}

async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

let fixed = 0;
for await (const file of walk(DIST)) {
  const src = await readFile(file, "utf8");
  let out = src;

  // Step 1: strip /src/ segment
  out = out
    .replace(/from "((?:\.\.?\/)*?)src\//g, 'from "$1')
    .replace(/from '((?:\.\.?\/)*?)src\//g, "from '$1")
    .replace(/import\("((?:\.\.?\/)*?)src\//g, 'import("$1');

  // Step 2: resolve bare directory imports to /index.js
  out = await replaceAsync(out, /from "(\.[\w\d\-_./]*?)"/g, async (match, p) => {
    if (p.endsWith(".js") || p.endsWith(".json")) return match;
    const abs = resolve(dirname(file), p);
    if (await isDir(abs)) return 'from "' + p + '/index.js"';
    return match;
  });

  if (out !== src) {
    await writeFile(file, out);
    fixed++;
  }
}
console.log("fix-paths: patched " + fixed + " files");

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => { promises.push(asyncFn(match, ...args)); return match; });
  const results = await Promise.all(promises);
  let i = 0;
  return str.replace(regex, () => results[i++]);
}
