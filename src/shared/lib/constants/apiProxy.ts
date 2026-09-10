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

/** Token list: GET returns Space Scan /tokens JSON. Browser uses this to avoid CORS. */
export const SPACESCAN_TOKENS_PATH = `${API_PROXY_ORIGIN}/api/spacescan/tokens`;

/** External Space Scan API (used by server-side proxy only). */
export const SPACESCAN_API_TOKENS_URL = "https://api.spacescan.io/tokens";

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
