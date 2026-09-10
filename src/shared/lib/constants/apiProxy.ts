/**
 * API proxy paths and CORS-related config.
 * All client requests to external APIs (Space Scan, etc.) go through these app routes
 * so the app serves responses and avoids CORS / referrer blocking in production.
 *
 * The Sage snapshot (`bun run build:sage`) has no server, so the proxy paths are
 * rebased onto the hosted deployment via NEXT_PUBLIC_API_PROXY_ORIGIN and the WASM
 * assets are read straight from the static `/wasm/` files via NEXT_PUBLIC_WASM_PATH_PREFIX.
 * Both are empty/unset for the hosted build, which keeps today's same-origin paths.
 */

/** Origin the proxy routes are served from. Empty (same origin) unless overridden. */
export const API_PROXY_ORIGIN = (process.env.NEXT_PUBLIC_API_PROXY_ORIGIN ?? "").replace(/\/+$/, "");

/**
 * True in the Sage snapshot build (`bun run build:sage` sets NEXT_PUBLIC_SAGE_BUILD).
 *
 * Inside Sage the proxy routes are a dead end: they live on the hosted
 * deployment, and a cross-origin fetch from `sage-app://` needs
 * Access-Control-Allow-Origin, which the deployment does not send. Space Scan's
 * own API does send `access-control-allow-origin: *`, and `<img>` loads are not
 * CORS-gated at all — they only need the host in the manifest's img-src
 * whitelist. So the Sage build talks to Space Scan directly and skips the proxy.
 */
export const IS_SAGE_BUILD = process.env.NEXT_PUBLIC_SAGE_BUILD === "1";

/** External Space Scan API (server-side proxy, and the Sage build's direct path). */
export const SPACESCAN_API_TOKENS_URL = "https://api.spacescan.io/tokens";

/** Token list: GET returns Space Scan /tokens JSON. Browser uses this to avoid CORS. */
export const SPACESCAN_TOKENS_PATH = IS_SAGE_BUILD
  ? SPACESCAN_API_TOKENS_URL
  : `${API_PROXY_ORIGIN}/api/spacescan/tokens`;

/** Icon image: GET ?url=<encoded Space Scan image URL>. Server fetches and streams image. */
export const SPACESCAN_ICON_PATH = `${API_PROXY_ORIGIN}/api/spacescan/icon`;

/** Allowed hosts for the icon proxy (SSRF protection). */
export const SPACESCAN_ICON_ALLOWED_HOSTS = ["assets.spacescan.io", "images.spacescan.io"] as const;

/** Build icon proxy URL for a Space Scan preview URL (browser only). */
export function getSpaceScanIconProxyUrl(previewUrl: string): string {
  return `${SPACESCAN_ICON_PATH}?url=${encodeURIComponent(previewUrl.trim())}`;
}

/** True if the URL is a Space Scan icon origin (for allowlist in proxy). */
export function isSpaceScanIconOrigin(url: string): boolean {
  try {
    const { protocol, host } = new URL(url);
    return (
      (protocol === "https:" || protocol === "http:") &&
      (SPACESCAN_ICON_ALLOWED_HOSTS as readonly string[]).includes(host)
    );
  } catch {
    return false;
  }
}

/** True if the URL is our icon proxy (so client should fetch blob and cache). */
export function isSpaceScanIconProxyUrl(url: string): boolean {
  return url.startsWith(`${SPACESCAN_ICON_PATH}?`);
}

/**
 * WASM assets: GET /api/wasm/:file serves splash_wasm.js and splash_wasm_bg.wasm with
 * correct MIME (the hosted deployment sits behind a reverse proxy with unreliable MIME
 * for /wasm/*). The Sage snapshot has no route handlers and serves the files itself,
 * so `bun run build:sage` sets this to "/wasm".
 */
export const WASM_PATH_PREFIX = process.env.NEXT_PUBLIC_WASM_PATH_PREFIX || "/api/wasm";

export const WASM_FILES = ["splash_wasm.js", "splash_wasm_bg.wasm"] as const;
