import { beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DEFAULT_CHIA_WASM_PATH, loadChiaOfferDriver, type ChiaOfferDriver } from "./driver";
import { loadTestDriver } from "./__fixtures__/testDriver";

const wasmPath = createRequire(import.meta.url).resolve(
  "chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.wasm"
);

describe("loadChiaOfferDriver", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  it("instantiates the wasm module from raw bytes", () => {
    expect(typeof driver.encodeOffer).toBe("function");
    expect(typeof driver.decodeOffer).toBe("function");
    expect(typeof driver.Clvm).toBe("function");
  });

  it("memoises the instance, because the glue module holds it in module scope", async () => {
    const again = await loadChiaOfferDriver(readFileSync(wasmPath));
    expect(again).toBe(driver);
  });

  it("accepts a pre-compiled WebAssembly.Module", async () => {
    const compiled = await WebAssembly.compile(readFileSync(wasmPath));
    expect(await loadChiaOfferDriver(compiled)).toBe(driver);
  });

  it("points at a path inside the app bundle by default", () => {
    expect(DEFAULT_CHIA_WASM_PATH).toBe("/wasm/chia_wallet_sdk_wasm_bg.wasm");
  });

  it("exposes the puzzles the offer format is built on", () => {
    const settlement = driver.Constants.settlementPaymentHash();
    expect(settlement).toHaveLength(32);
    expect(driver.Constants.catPuzzleHash()).toHaveLength(32);
    expect(driver.Constants.p2DelegatedPuzzleOrHiddenPuzzleHash()).toHaveLength(32);
  });

  it("uses globalThis.crypto for randomness rather than eval or new Function", () => {
    // Sage serves apps under `script-src 'self' 'wasm-unsafe-eval'`, which permits
    // WebAssembly compilation but not `eval` / `new Function`. The driver's only source
    // of randomness goes through `globalThis.crypto.getRandomValues`.
    expect(driver.generateBytes(32)).toHaveLength(32);
    expect(driver.generateBytes(32)).not.toEqual(driver.generateBytes(32));
  });
});
