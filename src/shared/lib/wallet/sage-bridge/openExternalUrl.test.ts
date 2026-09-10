import { describe, it, expect, afterEach, mock } from "bun:test";
import { openExternalUrl } from "./openExternalUrl";

type SageGlobals = { __TAURI__?: unknown; __SAGE__?: unknown };

function clearGlobals() {
  delete (globalThis as SageGlobals).__TAURI__;
  delete (globalThis as SageGlobals).__SAGE__;
}

afterEach(() => {
  clearGlobals();
  (window.open as unknown as { mockRestore?: () => void }).mockRestore?.();
});

describe("openExternalUrl", () => {
  it("opens a plain window in an ordinary browser", async () => {
    const openSpy = mock(() => null);
    window.open = openSpy as unknown as typeof window.open;

    await openExternalUrl("https://example.com");

    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });

  it("never calls window.open inside Sage (denied by the app webview's navigation policy)", async () => {
    (globalThis as SageGlobals).__TAURI__ = { invoke: () => {} };
    const openSpy = mock(() => null);
    window.open = openSpy as unknown as typeof window.open;

    // No real Tauri bridge exists in this test environment, so the call to
    // the bridge itself will reject — the assertion here is only that Sage's
    // denied window.open path is never taken.
    await openExternalUrl("https://example.com").catch(() => {});

    expect(openSpy).not.toHaveBeenCalled();
  });
});
