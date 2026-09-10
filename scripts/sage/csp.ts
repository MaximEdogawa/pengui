/**
 * The Content-Security-Policy Sage puts on every response from the app protocol.
 *
 * Mirrored from `crates/sage-apps/src/security/csp.rs` (xch-dev/sage, Sage 0.13.0):
 * `connect-src` gains the granted network whitelist for the active network, `img-src`
 * gains its https entries, and nothing else varies. Used by the local snapshot server
 * and by the Playwright CSP check so the snapshot is exercised under the real policy.
 */

import { whitelistForNetwork, type SageManifest } from "./manifestSchema";

export function buildAppCsp(whitelist: string[] = []): string {
  const connectSrc = ["'self'", ...whitelist].join(" ");
  const imgSrc = ["'self'", "blob:", "data:", ...whitelist.filter((e) => e.startsWith("https://"))].join(" ");

  return [
    "child-src 'none'",
    `connect-src ${connectSrc}`,
    "default-src 'self'",
    "font-src 'self' data:",
    "frame-src 'none'",
    `img-src ${imgSrc}`,
    "manifest-src 'none'",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "prefetch-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
}

/** CSP for a manifest as installed on one Sage network (all whitelist entries granted). */
export function buildAppCspForManifest(manifest: SageManifest, networkId = "mainnet"): string {
  return buildAppCsp(whitelistForNetwork(manifest, networkId));
}
