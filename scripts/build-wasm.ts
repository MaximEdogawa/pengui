#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script; console is the intended output */
/**
 * Build the Splash libp2p client (crates/splash-wasm) into public/wasm/.
 *
 * Used by `bun run build:wasm` and, through it, by `bun run build:all`.
 * wasm-pack ships as a devDependency, so a global install is not required —
 * only the Rust toolchain has to be present.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CRATE_DIR = join(ROOT, "crates", "splash-wasm");
const OUT_DIR = join(ROOT, "public", "wasm");
const WASM_TARGET = "wasm32-unknown-unknown";

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function run(cmd: string[], cwd = ROOT): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  return proc.exited;
}

async function capture(cmd: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    return exitCode === 0 ? stdout : null;
  } catch {
    return null;
  }
}

const hasCargo = (await capture(["cargo", "--version"])) !== null;
if (!hasCargo) {
  fail(
    "cargo not found. Install the Rust toolchain from https://rustup.rs, then re-run `bun run build:wasm`."
  );
}

// wasm-pack compiles for wasm32-unknown-unknown; add it when rustup manages the toolchain.
const installedTargets = await capture(["rustup", "target", "list", "--installed"]);
if (installedTargets === null) {
  console.warn(
    `⚠️  rustup not found — assuming the ${WASM_TARGET} target is already available for this toolchain.`
  );
} else if (!installedTargets.includes(WASM_TARGET)) {
  console.log(`📦 Adding Rust target ${WASM_TARGET}...`);
  if ((await run(["rustup", "target", "add", WASM_TARGET])) !== 0) {
    fail(`Failed to add the ${WASM_TARGET} Rust target.`);
  }
}

const localWasmPack = join(ROOT, "node_modules", ".bin", "wasm-pack");
let wasmPack = existsSync(localWasmPack) ? localWasmPack : null;
if (!wasmPack) {
  wasmPack = (await capture(["wasm-pack", "--version"])) !== null ? "wasm-pack" : null;
}
if (!wasmPack) {
  fail(
    "wasm-pack not found. Run `bun install` to install it (it ships as a devDependency), or install it globally with `cargo install wasm-pack`."
  );
}

console.log("🦀 Building splash-wasm → public/wasm/");
const exitCode = await run([wasmPack, "build", "--target", "web", "--out-dir", OUT_DIR], CRATE_DIR);
if (exitCode !== 0) {
  fail("wasm-pack build failed.");
}

if (!existsSync(join(OUT_DIR, "splash_wasm_bg.wasm"))) {
  fail(`wasm-pack reported success but ${join(OUT_DIR, "splash_wasm_bg.wasm")} is missing.`);
}

console.log("✅ WASM build complete: public/wasm/");
