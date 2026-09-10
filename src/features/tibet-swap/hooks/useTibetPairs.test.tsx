/**
 * Regression test: the swap tab resolves its pair by looking the token up in the
 * pair list, so a partial list silently degrades into the "Select assets using
 * the filter above" placeholder. Tibet lists BYC - the default mainnet pair -
 * around index 300 of ~374, well past the single 100-item page this hook used to
 * request.
 */

import { describe, expect, it, afterEach, beforeEach } from "bun:test";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { AllTheProviders } from "@/test-utils";
import { useTibetPairs } from "./useTibetPairs";

const originalFetch = globalThis.fetch;
const TOTAL_PAIRS = 374;
const requestedUrls: string[] = [];

function makePair(index: number) {
  const shortName = index === 301 ? "BYC" : `TK${index}`;
  return {
    pair_id: `pair-${index}`,
    asset_id: `asset-${index}`,
    asset_hidden_puzzle_hash: null,
    asset_name: shortName,
    asset_short_name: shortName,
    asset_image_url: null,
    asset_verified: true,
    inverse_fee: 993,
    liquidity_asset_id: `lp-${index}`,
    xch_reserve: 1000,
    token_reserve: 1000,
    liquidity: 1000,
    last_coin_id_on_chain: `coin-${index}`,
  };
}

const ALL_PAIRS = Array.from({ length: TOTAL_PAIRS }, (_, i) => makePair(i));

beforeEach(() => {
  requestedUrls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requestedUrls.push(url.toString());
    const skip = Number(url.searchParams.get("skip") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? TOTAL_PAIRS);
    return new Response(JSON.stringify(ALL_PAIRS.slice(skip, skip + limit)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("useTibetPairs", () => {
  it("returns every pair, including tokens past the first page", async () => {
    const { result } = renderHook(() => useTibetPairs(), { wrapper: AllTheProviders });

    await waitFor(() => expect(result.current.data?.length).toBe(TOTAL_PAIRS));
    expect(result.current.data?.some((p) => p.asset_short_name === "BYC")).toBe(true);
    expect(requestedUrls.length).toBeGreaterThan(1);
  });

  it("still fetches a single page when skip/limit are given", async () => {
    const { result } = renderHook(() => useTibetPairs({ limit: 10 }), {
      wrapper: AllTheProviders,
    });

    await waitFor(() => expect(result.current.data?.length).toBe(10));
    expect(requestedUrls).toHaveLength(1);
  });
});
