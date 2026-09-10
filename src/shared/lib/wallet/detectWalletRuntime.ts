import type { WalletRuntimeKind } from "./types";

/**
 * Globals Sage exposes inside its app webview.
 *
 * `__TAURI__` is set by the Sage shell (`withGlobalTauri`), `__SAGE__` is
 * created by `initSageRuntimeBridge()` from `sage-app-sdk`. Detection must stay
 * synchronous and side-effect free: the previous attempt polled for a host that
 * never injects anything, which is exactly what this function replaces.
 */
interface SageRuntimeGlobals {
  __TAURI__?: unknown;
  __SAGE__?: unknown;
  __SAGE_APP_INFO__?: unknown;
}

/**
 * Detect which wallet transport the app is running on.
 *
 * Pure and synchronous — no timers, no polling, no network. Returns
 * `"walletconnect"` on the server and in ordinary browsers.
 */
export function detectWalletRuntime(): WalletRuntimeKind {
  if (typeof globalThis === "undefined") {
    return "walletconnect";
  }

  const globals = globalThis as SageRuntimeGlobals;

  if (globals.__TAURI__ != null || globals.__SAGE__ != null) {
    return "sage-bridge";
  }

  if (typeof window !== "undefined") {
    const windowGlobals = window as unknown as SageRuntimeGlobals;
    if (windowGlobals.__TAURI__ != null || windowGlobals.__SAGE__ != null) {
      return "sage-bridge";
    }
  }

  return "walletconnect";
}

/** True when the app is running inside the Sage app webview. */
export function isSageRuntime(): boolean {
  return detectWalletRuntime() === "sage-bridge";
}
