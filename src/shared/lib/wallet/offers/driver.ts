/**
 * Loader for the browser Chia driver used to build offers client side.
 *
 * The driver is `chia-wallet-sdk-wasm` — the WebAssembly bindings of
 * https://github.com/xch-dev/chia-wallet-sdk, the same library Sage itself is built on.
 *
 * ## Why the module is instantiated by hand
 *
 * The package ships the wasm-bindgen **bundler** target. Its `main` entry does
 * `import * as wasm from "./chia_wallet_sdk_wasm_bg.wasm"`, which only resolves in a
 * bundler with WebAssembly ESM integration turned on (webpack
 * `experiments.asyncWebAssembly`, which Next.js does not enable by default). Importing
 * the glue module directly and calling `WebAssembly.instantiate` ourselves keeps the
 * dependency out of the bundler's wasm pipeline entirely: webpack sees one ordinary
 * (large) JavaScript module in a lazy chunk, and the `.wasm` file is a plain static
 * asset fetched at runtime.
 *
 * ## Content Security Policy
 *
 * Sage serves installed apps under `script-src 'self' 'wasm-unsafe-eval'`. That allows
 * `WebAssembly.compile` / `instantiate` but **not** `eval` or `new Function`. The glue
 * module does contain the standard wasm-bindgen `Function::new_no_args` shim, but it is
 * only reached by `js_sys::global()`'s last-resort fallback; the module resolves the
 * global object and the RNG through `globalThis` / `globalThis.crypto.getRandomValues`
 * directly. See the offers section of `pengui-wiki/architecture/sage-in-app-integration.md`.
 */

/** The driver surface: the full `chia-wallet-sdk-wasm` module namespace. */
export type ChiaOfferDriver = typeof import("chia-wallet-sdk-wasm");

/**
 * Where the `.wasm` binary comes from.
 *
 * - `WebAssembly.Module` — already compiled (fastest for repeated test runs).
 * - `BufferSource` — raw bytes, e.g. from `fs.readFile` in a test.
 * - `Response` / `Promise<Response>` — streamed, e.g. `fetch(url)`.
 * - `string` / `URL` — fetched, with a non-streaming fallback for hosts that do not
 *   serve `application/wasm`.
 */
export type ChiaWasmSource =
  | WebAssembly.Module
  | BufferSource
  | Response
  | Promise<Response>
  | string
  | URL;

/**
 * Default location of the wasm binary inside the app bundle.
 *
 * The packaging step copies
 * `node_modules/chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.wasm` to
 * `public/wasm/chia_wallet_sdk_wasm_bg.wasm`, next to the Splash wasm that is already
 * shipped that way. Under Sage the file resolves against the `sage-app://` origin, so it
 * is covered by `default-src 'self'` and needs no network whitelist entry.
 */
export const DEFAULT_CHIA_WASM_PATH = "/wasm/chia_wallet_sdk_wasm_bg.wasm";

/** Import name the glue module is bound to inside the wasm module. */
const GLUE_IMPORT_NAME = "./chia_wallet_sdk_wasm_bg.js";

let driverPromise: Promise<ChiaOfferDriver> | null = null;

function isResponseLike(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

function isBufferSource(value: unknown): value is BufferSource {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

async function instantiate(
  source: ChiaWasmSource,
  imports: WebAssembly.Imports
): Promise<WebAssembly.Instance> {
  if (source instanceof WebAssembly.Module) {
    return WebAssembly.instantiate(source, imports);
  }

  if (isBufferSource(source)) {
    const { instance } = await WebAssembly.instantiate(source, imports);
    return instance;
  }

  const response = isResponseLike(source) ? source : await resolveResponse(source);

  if (typeof WebAssembly.instantiateStreaming === "function") {
    try {
      const { instance } = await WebAssembly.instantiateStreaming(response.clone(), imports);
      return instance;
    } catch {
      // Falls through: some hosts serve the file without `application/wasm`.
    }
  }

  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  return instance;
}

async function resolveResponse(source: Promise<Response> | string | URL): Promise<Response> {
  if (typeof source === "string" || source instanceof URL) {
    const response = await fetch(source instanceof URL ? source.href : source);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch the Chia driver wasm from ${String(source)}: ${response.status} ${response.statusText}`
      );
    }
    return response;
  }
  return source;
}

/**
 * Loads and instantiates the Chia driver once per JavaScript realm.
 *
 * The wasm-bindgen glue module holds the instance in module scope, so a realm can only
 * ever hold one instantiation. Repeat calls return the first result and ignore `source`;
 * call {@link resetChiaOfferDriver} (tests only) to drop the memo.
 *
 * @param source - where to get the `.wasm` binary from. Defaults to fetching
 *   {@link DEFAULT_CHIA_WASM_PATH}, which requires a `fetch` capable host.
 * @returns the driver namespace.
 *
 * @example
 * ```ts
 * const driver = await loadChiaOfferDriver();
 * const bundle = driver.decodeOffer(offerString);
 * ```
 */
export function loadChiaOfferDriver(
  source: ChiaWasmSource = DEFAULT_CHIA_WASM_PATH
): Promise<ChiaOfferDriver> {
  driverPromise ??= (async () => {
    const glue = await import("chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.js");
    const instance = await instantiate(source, {
      [GLUE_IMPORT_NAME]: glue as unknown as WebAssembly.ModuleImports,
    });
    glue.__wbg_set_wasm(instance.exports);
    glue.setPanicHook();
    return glue as unknown as ChiaOfferDriver;
  })().catch((error: unknown) => {
    driverPromise = null;
    throw error;
  });

  return driverPromise;
}

/**
 * Drops the memoised driver.
 *
 * Only useful in tests: the underlying glue module keeps its wasm instance, so a second
 * `loadChiaOfferDriver` call after a reset re-binds the module rather than isolating it.
 */
export function resetChiaOfferDriver(): void {
  driverPromise = null;
}
