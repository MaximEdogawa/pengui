#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Verify that a finalised snapshot can actually be installed and run as a Sage app.
 *
 * Everything checked here is mechanical and repeatable in CI:
 *   • the source manifest only uses capability names Sage knows and whitelist entries
 *     Sage accepts (see ./manifestSchema.ts);
 *   • the finalised manifest lists every file in the snapshot, including `entry` and
 *     `icon`, and stays inside the 2000 file / 50 MB limits;
 *   • no HTML file contains an inline `<script>` (`script-src 'self'`, no nonce) or a
 *     `<link rel="manifest">` (`manifest-src 'none'`);
 *   • nothing registers a service worker (Sage rejects them);
 *   • nothing points at a same-origin `/api/*` route (there are no route handlers in a
 *     snapshot); cross-origin proxy URLs on the hosted deployment are fine;
 *   • the Splash WASM files are shipped and referenced from `/wasm/`.
 *
 * Hydration under the real CSP is checked separately by tests/sage/csp.spec.ts.
 *
 * Usage: bun run scripts/sage/verify-snapshot.ts [outDir]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  MAX_FILE_COUNT,
  MAX_TOTAL_SIZE_BYTES,
  validateSourceManifest,
  type SageManifest,
} from "./manifestSchema";

const OUT_DIR = resolve(process.argv[2] ?? "out");
const SOURCE_MANIFEST = resolve("sage-manifest.json");

const INLINE_SCRIPT_RE = /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/gi;
const MANIFEST_LINK_RE = /<link\b[^>]*\brel=["']manifest["'][^>]*>/gi;
const SERVICE_WORKER_RE = /serviceWorker\s*\.\s*register|navigator\.serviceWorker/g;
/** A quoted root-relative `/api/...` path, i.e. a call that needs a server we do not have. */
const SAME_ORIGIN_API_RE = /["'`]\/api\//g;

const TEXT_EXTENSIONS = [".html", ".js", ".mjs", ".css", ".txt", ".json"];

const problems: string[] = [];
const checks: string[] = [];

function fail(message: string): void {
  problems.push(message);
}

function pass(message: string): void {
  checks.push(message);
}

function listFiles(dir: string, root = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, root));
    else if (entry.isFile()) out.push(relative(root, abs).split("\\").join("/"));
  }
  return out;
}

function readManifest(path: string, label: string): SageManifest | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SageManifest;
  } catch (error) {
    fail(`${label} could not be read: ${(error as Error).message}`);
    return null;
  }
}

// ── Source manifest ────────────────────────────────────────────────────────────────
const source = readManifest(SOURCE_MANIFEST, "sage-manifest.json");
if (source) {
  const manifestProblems = validateSourceManifest(source);
  if (manifestProblems.length > 0) manifestProblems.forEach((problem) => fail(problem));
  else {
    const capabilities = source.permissions?.capabilities;
    pass(
      `sage-manifest.json valid: ${capabilities?.required?.length ?? 0} required + ` +
        `${capabilities?.optional?.length ?? 0} optional capabilities, all known to Sage 0.13`
    );
  }
}

// ── Snapshot ───────────────────────────────────────────────────────────────────────
let snapshotFiles: string[] = [];
try {
  if (!statSync(OUT_DIR).isDirectory()) throw new Error("not a directory");
  snapshotFiles = listFiles(OUT_DIR);
} catch {
  fail(`snapshot directory not found: ${OUT_DIR}`);
}

const finalManifest = snapshotFiles.includes("sage-manifest.json")
  ? readManifest(join(OUT_DIR, "sage-manifest.json"), "out/sage-manifest.json")
  : null;
if (snapshotFiles.length > 0 && !finalManifest) {
  fail("out/sage-manifest.json is missing — run `sage-app finalize-manifest`");
}

if (finalManifest) {
  const listed = new Set((finalManifest.files ?? []).map((file) => file.path));
  const shipped = snapshotFiles.filter((path) => path !== "sage-manifest.json" && path !== "manifest.json");
  const unlisted = shipped.filter((path) => !listed.has(path));
  if (unlisted.length > 0) {
    fail(`${unlisted.length} snapshot files are not listed in files[] (e.g. ${unlisted.slice(0, 3).join(", ")})`);
  } else {
    pass(`all ${shipped.length} snapshot files are listed in files[]`);
  }

  const totalSize = (finalManifest.files ?? []).reduce((sum, file) => sum + file.size, 0);
  if (listed.size > MAX_FILE_COUNT) fail(`file count ${listed.size} exceeds Sage's limit of ${MAX_FILE_COUNT}`);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    fail(`snapshot size ${totalSize} exceeds Sage's limit of ${MAX_TOTAL_SIZE_BYTES}`);
  }
  if (listed.size <= MAX_FILE_COUNT && totalSize <= MAX_TOTAL_SIZE_BYTES) {
    pass(
      `snapshot is ${listed.size}/${MAX_FILE_COUNT} files and ` +
        `${(totalSize / 1024 / 1024).toFixed(1)}/${MAX_TOTAL_SIZE_BYTES / 1024 / 1024} MB`
    );
  }

  const entry = finalManifest.entry ?? "index.html";
  if (!listed.has(entry)) fail(`entry "${entry}" is not listed in files[]`);
  else pass(`entry "${entry}" is listed`);
  if (finalManifest.icon && !listed.has(finalManifest.icon)) {
    fail(`icon "${finalManifest.icon}" is not listed in files[]`);
  } else if (finalManifest.icon) {
    pass(`icon "${finalManifest.icon}" is listed`);
  }
  const avatar = finalManifest.author?.avatar;
  if (avatar && !listed.has(avatar)) fail(`author.avatar "${avatar}" is not listed in files[]`);
}

// ── HTML and asset content ─────────────────────────────────────────────────────────
const htmlFiles = snapshotFiles.filter((path) => path.endsWith(".html"));
if (htmlFiles.length === 0 && snapshotFiles.length > 0) fail("snapshot contains no HTML files");

let inlineScripts = 0;
let manifestLinks = 0;
for (const path of htmlFiles) {
  const html = readFileSync(join(OUT_DIR, path), "utf8");
  const inline = [...html.matchAll(INLINE_SCRIPT_RE)].filter((match) => match[0].includes("</script>") && !/^<script[^>]*>\s*<\/script>$/.test(match[0]));
  if (inline.length > 0) {
    inlineScripts += inline.length;
    fail(`${path}: ${inline.length} inline <script> block(s) — blocked by script-src 'self'`);
  }
  const links = [...html.matchAll(MANIFEST_LINK_RE)];
  if (links.length > 0) {
    manifestLinks += links.length;
    fail(`${path}: <link rel="manifest"> — blocked by manifest-src 'none'`);
  }
}
if (inlineScripts === 0 && htmlFiles.length > 0) pass(`no inline <script> in ${htmlFiles.length} HTML files`);
if (manifestLinks === 0 && htmlFiles.length > 0) pass('no <link rel="manifest">');

const textFiles = snapshotFiles.filter((path) => TEXT_EXTENSIONS.some((ext) => path.endsWith(ext)));
const serviceWorkerHits: string[] = [];
const apiHits: string[] = [];
const apiWasmHits: string[] = [];
let wasmPrefixReferenced = false;
for (const path of textFiles) {
  const content = readFileSync(join(OUT_DIR, path), "utf8");
  if (SERVICE_WORKER_RE.test(content)) serviceWorkerHits.push(path);
  SERVICE_WORKER_RE.lastIndex = 0;
  if (SAME_ORIGIN_API_RE.test(content)) apiHits.push(path);
  SAME_ORIGIN_API_RE.lastIndex = 0;
  if (content.includes("/api/wasm")) apiWasmHits.push(path);
  if (/["'`]\/wasm["'`/]/.test(content)) wasmPrefixReferenced = true;
}
if (serviceWorkerHits.length > 0) {
  fail(`service worker registration found in: ${serviceWorkerHits.slice(0, 3).join(", ")}`);
} else if (textFiles.length > 0) {
  pass(`no service worker registration in ${textFiles.length} text files`);
}
if (apiHits.length > 0) {
  fail(`same-origin /api/* reference found in: ${apiHits.slice(0, 5).join(", ")}`);
} else if (textFiles.length > 0) {
  pass("no same-origin /api/* references");
}

// ── Splash WASM ────────────────────────────────────────────────────────────────────
const wasmFiles = ["wasm/splash_wasm.js", "wasm/splash_wasm_bg.wasm"];
const missingWasm = wasmFiles.filter((path) => !snapshotFiles.includes(path));
if (snapshotFiles.length > 0) {
  if (missingWasm.length > 0) fail(`Splash WASM missing from the snapshot: ${missingWasm.join(", ")}`);
  else pass("Splash WASM shipped at /wasm/splash_wasm.js and /wasm/splash_wasm_bg.wasm");
}

if (snapshotFiles.length > 0) {
  if (apiWasmHits.length > 0) {
    fail(`/api/wasm reference found in: ${apiWasmHits.slice(0, 3).join(", ")} — set NEXT_PUBLIC_WASM_PATH_PREFIX`);
  } else if (wasmPrefixReferenced) {
    pass("app code loads Splash WASM from /wasm/, not /api/wasm");
  } else {
    fail("no /wasm path literal in the bundle — WASM_PATH_PREFIX did not reach the client code");
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────────
for (const check of checks) console.log(`  ✓ ${check}`);
for (const problem of problems) console.error(`  ✗ ${problem}`);

if (problems.length > 0) {
  console.error(`\n❌ Snapshot verification failed: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`\n✅ Snapshot verification passed: ${checks.length} checks`);
