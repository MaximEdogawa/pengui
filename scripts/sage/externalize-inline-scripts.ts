#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Make a Next.js static export installable as a Sage app.
 *
 * Sage serves an installed app under `script-src 'self' 'wasm-unsafe-eval'` with no
 * `unsafe-inline` and no nonce, and under `manifest-src 'none'`. A Next.js export
 * contains three kinds of inline script:
 *
 *   1. `(self.__next_s = …).push([0, { children, id }])` — the `beforeInteractive`
 *      scripts from `src/app/layout.tsx`. The Next.js client runtime replays these by
 *      creating a `<script>` element with `innerHTML`, which the CSP blocks as well, so
 *      the payload is emitted as its own external file and the push is dropped.
 *   2. `self.__next_f.push([…])` — the RSC flight payload consumed during hydration.
 *   3. The `next-themes` no-flash script.
 *
 * Every one of them is moved into `/_next/static/inline/<sha256>.js` and referenced with
 * `src=` at the exact position it occupied, so execution order is unchanged. The web app
 * manifest link is removed (`manifest-src 'none'` blocks it).
 *
 * Usage: bun run scripts/sage/externalize-inline-scripts.ts [outDir]
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const OUT_DIR = resolve(process.argv[2] ?? "out");
const INLINE_DIR_REL = "_next/static/inline";
const INLINE_DIR = join(OUT_DIR, INLINE_DIR_REL);

/** `<script …>…</script>` without a `src` attribute. */
const INLINE_SCRIPT_RE = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
/** `<link rel="manifest" …>` in any attribute order. */
const MANIFEST_LINK_RE = /<link\b[^>]*\brel=["']manifest["'][^>]*>/gi;
/** `(self.__next_s=self.__next_s||[]).push([0,{…}])` — one `beforeInteractive` script. */
const NEXT_S_PUSH_RE = /^\(self\.__next_s\s*=\s*self\.__next_s\s*\|\|\s*\[\]\)\.push\(\[0,([\s\S]*)\]\);?$/;

interface Stats {
  htmlFiles: number;
  externalised: number;
  beforeInteractive: number;
  manifestLinks: number;
  written: number;
}

function listHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(abs));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(abs);
  }
  return out;
}

/** Decode the HTML entities React escapes inside inline script text. */
function decodeScriptText(raw: string): string {
  return raw
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0026/g, "&");
}

/**
 * `beforeInteractive` payload: return the script body so it executes directly instead of
 * being queued for the runtime to re-inject inline. Returns null for anything else.
 */
function unwrapBeforeInteractive(code: string): string | null {
  const match = NEXT_S_PUSH_RE.exec(code.trim());
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1]) as { children?: string; src?: string };
    if (typeof payload.src === "string") return null;
    return typeof payload.children === "string" ? payload.children : null;
  } catch {
    return null;
  }
}

function writeInlineFile(code: string, stats: Stats): string {
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 16);
  const rel = `${INLINE_DIR_REL}/${hash}.js`;
  const abs = join(OUT_DIR, rel);
  try {
    statSync(abs);
  } catch {
    writeFileSync(abs, code);
    stats.written += 1;
  }
  return `/${rel}`;
}

function processHtml(file: string, stats: Stats): void {
  const original = readFileSync(file, "utf8");

  let html = original.replace(MANIFEST_LINK_RE, () => {
    stats.manifestLinks += 1;
    return "";
  });

  html = html.replace(INLINE_SCRIPT_RE, (whole, attrs: string, body: string) => {
    if (body.trim() === "") return whole;

    const unwrapped = unwrapBeforeInteractive(body);
    if (unwrapped !== null) stats.beforeInteractive += 1;
    const code = decodeScriptText(unwrapped ?? body);

    const src = writeInlineFile(code, stats);
    stats.externalised += 1;
    // Keep the original attributes (id, type, …) so nothing else changes, and stay a
    // classic blocking script so the relative execution order is exactly as parsed.
    return `<script${attrs} src="${src}"></script>`;
  });

  if (html !== original) writeFileSync(file, html);
  stats.htmlFiles += 1;
}

function main(): void {
  try {
    if (!statSync(OUT_DIR).isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`❌ Export directory not found: ${OUT_DIR}`);
    process.exit(1);
  }

  mkdirSync(INLINE_DIR, { recursive: true });

  const stats: Stats = {
    htmlFiles: 0,
    externalised: 0,
    beforeInteractive: 0,
    manifestLinks: 0,
    written: 0,
  };

  for (const file of listHtmlFiles(OUT_DIR)) processHtml(file, stats);

  console.log(
    `✅ Externalised ${stats.externalised} inline scripts ` +
      `(${stats.beforeInteractive} beforeInteractive, ${stats.written} unique files) ` +
      `across ${stats.htmlFiles} HTML files in ${relative(process.cwd(), OUT_DIR) || "."}; ` +
      `removed ${stats.manifestLinks} <link rel="manifest">`
  );
}

main();
