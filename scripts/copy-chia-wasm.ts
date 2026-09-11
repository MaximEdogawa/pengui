#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Copy `chia-wallet-sdk-wasm`'s binary into public/wasm/.
 *
 * `src/shared/lib/wallet/offers/driver.ts` fetches the wasm from
 * `/wasm/chia_wallet_sdk_wasm_bg.wasm` at runtime (offer construction inside
 * Sage and, longer term, in the hosted app). The npm package ships the
 * bundler-target glue module; the plain `.wasm` binary is not otherwise
 * copied anywhere. Runs on `bun install` (see package.json's `postinstall`)
 * so the file is always in place without a separate manual step, in both the
 * hosted build and the Sage snapshot build.
 *
 * Kept out of git (public/wasm/.gitignore ignores everything in the
 * directory) — this script is the only source of truth for the file.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "node_modules", "chia-wallet-sdk-wasm", "chia_wallet_sdk_wasm_bg.wasm");
const OUT_DIR = join(ROOT, "public", "wasm");
const DEST = join(OUT_DIR, "chia_wallet_sdk_wasm_bg.wasm");

if (!existsSync(SOURCE)) {
  console.error(`❌ ${SOURCE} not found. Run \`bun install\` first.`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SOURCE, DEST);

console.log(`✅ Copied chia-wallet-sdk-wasm binary → ${DEST}`);
