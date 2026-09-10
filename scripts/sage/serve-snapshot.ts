#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Serve a finalised Sage snapshot the way Sage's app protocol does, for local
 * verification and for the Playwright CSP check.
 *
 * Faithful to `crates/sage-apps` in the ways that can break the app:
 *   • every response carries the app CSP (see ./csp.ts), with the whitelist expanded
 *     from the snapshot's own sage-manifest.json for the requested network;
 *   • `/` resolves to the manifest `entry` and nothing else — no directory index, no
 *     SPA fallback, no rewrite;
 *   • only files listed in the manifest are served, so a file missing from `files[]`
 *     404s here exactly as it would after install;
 *   • service worker requests are rejected.
 *
 * Usage: bun run scripts/sage/serve-snapshot.ts [--dir out] [--port 4173] [--network mainnet]
 */

import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildAppCspForManifest } from "./csp";
import type { SageManifest } from "./manifestSchema";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

const DIR = resolve(arg("dir", "out"));
const PORT = Number(arg("port", "4173"));
const NETWORK = arg("network", "mainnet");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

const manifestPath = join(DIR, "sage-manifest.json");
let manifest: SageManifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SageManifest;
} catch {
  console.error(`❌ No finalised manifest at ${manifestPath}. Run \`bun run build:sage\` first.`);
  process.exit(1);
}

const entry = manifest.entry ?? "index.html";
const listed = new Set((manifest.files ?? []).map((file) => file.path));
listed.add("sage-manifest.json");
const csp = buildAppCspForManifest(manifest, NETWORK);

function mimeFor(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "application/octet-stream" : (MIME[path.slice(dot)] ?? "application/octet-stream");
}

function respond(status: number, body: BodyInit | null, contentType?: string): Response {
  const headers: Record<string, string> = { "Content-Security-Policy": csp };
  if (contentType) headers["Content-Type"] = contentType;
  return new Response(body, { status, headers });
}

const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    // Sage rejects service worker registrations outright.
    if (request.headers.get("service-worker") === "script") {
      return respond(404, "service workers are not available in Sage apps", "text/plain");
    }

    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const target = path === "" ? entry : path;

    // No directory index, no SPA fallback: only listed files resolve.
    if (!listed.has(target)) return respond(404, `not in manifest files[]: /${target}`, "text/plain");

    const abs = join(DIR, target);
    try {
      if (!statSync(abs).isFile()) throw new Error("not a file");
    } catch {
      return respond(404, `missing file: /${target}`, "text/plain");
    }
    return respond(200, Bun.file(abs), mimeFor(target));
  },
});

console.log(`Serving ${DIR} as a Sage snapshot on http://localhost:${server.port} (network: ${NETWORK})`);
console.log(`Entry: /${entry}`);
console.log(`CSP:   ${csp}`);
