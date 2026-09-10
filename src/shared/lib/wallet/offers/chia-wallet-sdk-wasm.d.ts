/**
 * Type declaration for the raw wasm-bindgen glue module of `chia-wallet-sdk-wasm`.
 *
 * The package's `main` entry (`chia_wallet_sdk_wasm.js`) uses the wasm-bindgen
 * *bundler* target: it does `import * as wasm from "./chia_wallet_sdk_wasm_bg.wasm"`,
 * which only works with a bundler that has WebAssembly ESM integration enabled
 * (webpack `experiments.asyncWebAssembly`). Pengui instantiates the module itself
 * instead (see `driver.ts`), so it imports the glue module directly. The glue module
 * exports the same API as the package root plus the `__wbg_set_wasm` hook that binds
 * the instantiated wasm exports.
 */
declare module "chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.js" {
  export * from "chia-wallet-sdk-wasm";
  /** Binds the instantiated `WebAssembly.Instance` exports to the glue module. */
  export function __wbg_set_wasm(wasm: WebAssembly.Exports): void;
}
