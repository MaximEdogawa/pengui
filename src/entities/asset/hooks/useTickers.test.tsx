import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { renderHook, cleanup } from "@testing-library/react";
import { AllTheProviders } from "@/test-utils";
import { useCatTokens } from "./useTickers";

const originalFetch = globalThis.fetch;

describe("useCatTokens", () => {
  beforeEach(() => {
    // Keep the tickers query pending so the hook renders without any data,
    // which is when an unmemoized fallback array would leak a new reference.
    globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanup();
  });

  it("keeps the tickers reference stable across re-renders while no data is loaded", () => {
    const { result, rerender } = renderHook(() => useCatTokens(), { wrapper: AllTheProviders });

    const firstTickers = result.current.tickers;
    rerender();

    expect(result.current.tickers).toBe(firstTickers);
  });
});
