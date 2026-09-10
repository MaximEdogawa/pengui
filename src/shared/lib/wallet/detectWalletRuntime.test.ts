import { describe, it, expect, afterEach } from "bun:test";
import { detectWalletRuntime, isSageRuntime } from "./detectWalletRuntime";

/**
 * Runtime detection must stay synchronous and side-effect free: the previous
 * Sage attempt polled for a host that never injects anything, and the polling
 * loop is what this function replaces.
 */
type SageGlobals = { __TAURI__?: unknown; __SAGE__?: unknown };

function setGlobal(key: keyof SageGlobals, value: unknown) {
  (globalThis as SageGlobals)[key] = value;
}

function clearGlobals() {
  delete (globalThis as SageGlobals).__TAURI__;
  delete (globalThis as SageGlobals).__SAGE__;
  if (typeof window !== "undefined") {
    delete (window as unknown as SageGlobals).__TAURI__;
    delete (window as unknown as SageGlobals).__SAGE__;
  }
}

afterEach(clearGlobals);

describe("detectWalletRuntime", () => {
  it("defaults to walletconnect in an ordinary browser", () => {
    expect(detectWalletRuntime()).toBe("walletconnect");
    expect(isSageRuntime()).toBe(false);
  });

  it("detects the Sage host from globalThis.__TAURI__", () => {
    setGlobal("__TAURI__", { invoke: () => {} });
    expect(detectWalletRuntime()).toBe("sage-bridge");
    expect(isSageRuntime()).toBe(true);
  });

  it("detects the Sage bridge from window.__SAGE__", () => {
    (window as unknown as SageGlobals).__SAGE__ = { wallet: {} };
    expect(detectWalletRuntime()).toBe("sage-bridge");
  });

  it("ignores globals that are present but null", () => {
    setGlobal("__TAURI__", null);
    setGlobal("__SAGE__", undefined);
    expect(detectWalletRuntime()).toBe("walletconnect");
  });

  it("returns the same answer on repeated calls without caching state", () => {
    expect(detectWalletRuntime()).toBe("walletconnect");
    setGlobal("__SAGE__", {});
    expect(detectWalletRuntime()).toBe("sage-bridge");
    clearGlobals();
    expect(detectWalletRuntime()).toBe("walletconnect");
  });
});
