#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Build the Sage snapshot (`bun run build:sage`).
 *
 * Pipeline:
 *   1. check the Splash WASM artefacts exist (they are shipped inside the snapshot);
 *   2. `next build` with SAGE_BUILD=1 → `output: "export"`, `images.unoptimized`,
 *      and `pageExtensions` without `.ts` so no route handler is compiled (a snapshot
 *      has no server). NEXT_PUBLIC_* flags rebase the proxy paths onto the hosted
 *      deployment and the WASM files onto the static `/wasm/` copies;
 *   3. prune what Sage cannot use: the web app manifest (`manifest-src 'none'`) and
 *      source maps (the finalize CLI in sage-app-sdk 0.13.0 has no --exclude flag,
 *      so anything unwanted has to be deleted before it runs);
 *   4. externalise every inline `<script>` (`script-src 'self'`, no nonce);
 *   5. `sage-app finalize-manifest` → out/sage-manifest.json with sha256 per file;
 *   6. verify the result (scripts/sage/verify-snapshot.ts).
 *
 * The hosted deployment is untouched: without SAGE_BUILD, `bun run build` still
 * produces the `output: "standalone"` server with its API routes.
 */

import { existsSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const OUT_DIR = join(ROOT, "out");
const WASM_DIR = join(ROOT, "public", "wasm");
const SOURCE_MANIFEST = join(ROOT, "sage-manifest.json");

/** Origin serving the CORS-enabled proxy routes (src/app/api/spacescan/*). */
const API_PROXY_ORIGIN = process.env.SAGE_API_PROXY_ORIGIN || "https://pengui.space";

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function run(cmd: string[], env: Record<string, string> = {}): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, ...env },
  });
  if ((await proc.exited) !== 0) fail(`${cmd.join(" ")} failed`);
}

function removeMatching(dir: string, matches: (path: string) => boolean): number {
  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) removed += removeMatching(abs, matches);
    else if (entry.isFile() && matches(abs)) {
      unlinkSync(abs);
      removed += 1;
    }
  }
  return removed;
}

// 1. WASM artefacts -----------------------------------------------------------------
for (const file of ["splash_wasm.js", "splash_wasm_bg.wasm"]) {
  if (!existsSync(join(WASM_DIR, file))) {
    fail(`public/wasm/${file} is missing. Run \`bun run build:wasm\` first (needs the Rust toolchain).`);
  }
}

// Keep the snapshot version honest: Sage re-reviews permissions when `version` changes.
const packageVersion = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string;
const manifestVersion = JSON.parse(readFileSync(SOURCE_MANIFEST, "utf8")).version as string;
if (packageVersion !== manifestVersion) {
  console.warn(
    `⚠️  sage-manifest.json version ${manifestVersion} differs from package.json ${packageVersion}`
  );
}

// Sage keys its update flow on the manifest `version`. Rebuilding without
// bumping it serves a new snapshot under a version Sage already has, so the
// installed app silently keeps running the old code — which reads exactly like
// "my change didn't land". Compare against the snapshot we are about to
// replace and say so loudly.
const previousBuiltVersion = (() => {
  try {
    return JSON.parse(readFileSync(join(OUT_DIR, "sage-manifest.json"), "utf8")).version as string;
  } catch {
    return null;
  }
})();

// 2. Static export ------------------------------------------------------------------
rmSync(OUT_DIR, { recursive: true, force: true });
console.log("📦 next build (output: export)");
await run(["bun", "next", "build"], {
  SAGE_BUILD: "1",
  NEXT_PUBLIC_SAGE_BUILD: "1",
  NEXT_PUBLIC_WASM_PATH_PREFIX: "/wasm",
  NEXT_PUBLIC_API_PROXY_ORIGIN: API_PROXY_ORIGIN,
});
if (!existsSync(OUT_DIR)) fail("next build did not produce out/");

// 3. Prune --------------------------------------------------------------------------
const webManifest = join(OUT_DIR, "manifest.json");
if (existsSync(webManifest)) unlinkSync(webManifest);
const maps = removeMatching(OUT_DIR, (path) => path.endsWith(".map"));
console.log(`🧹 Pruned the web app manifest and ${maps} source map(s)`);

// 4. Inline scripts -----------------------------------------------------------------
await run(["bun", "run", join("scripts", "sage", "externalize-inline-scripts.ts"), OUT_DIR]);

// 5. Finalise the manifest ----------------------------------------------------------
console.log("🔏 sage-app finalize-manifest");
await run(["bun", "x", "sage-app", "finalize-manifest", "--source", SOURCE_MANIFEST, "--dist", OUT_DIR]);

// 6. Verify -------------------------------------------------------------------------
await run(["bun", "run", join("scripts", "sage", "verify-snapshot.ts"), OUT_DIR]);

console.log(
  `\n✅ Sage snapshot ready in out/ (version ${manifestVersion}).\n` +
    `   Serve it:   bun run sage:serve\n` +
    `   Install it: Sage → Apps → Install from URL → http://localhost:4173`
);

if (previousBuiltVersion === manifestVersion) {
  console.warn(
    `\n⚠️  Version ${manifestVersion} is unchanged from the snapshot you just replaced.\n` +
      `   Sage updates an installed app only when the manifest version changes, so it\n` +
      `   will keep running the previously installed code and your changes will not\n` +
      `   appear. Bump "version" in sage-manifest.json and rebuild.`
  );
}
