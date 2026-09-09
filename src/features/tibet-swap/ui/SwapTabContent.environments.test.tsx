import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { render, screen, waitFor, cleanup } from "@/test-utils";
import { SelectedOrderProvider } from "@/features/trading/hooks/SelectedOrderProvider";
import { useOrderBookFilterStore } from "@/features/trading/hooks/orderBookFilterStore";
import { SwapTabContent } from "./SwapTabContent";
import type { TibetApiPair } from "../lib/tibetTypes";

/**
 * Swap must be available in every Pengui environment. The swap UI itself has no
 * feature flag and no network condition, so what has to hold per environment is
 * that the swap/add/remove controls render and that Tibet is queried through the
 * configured base URL — on mainnet and on testnet alike.
 */

const NETWORK_STORAGE_KEY = "pengui-network";

function makePair(shortName: string, pairId: string): TibetApiPair {
  return {
    pair_id: pairId,
    asset_id: `asset-${pairId}`,
    asset_hidden_puzzle_hash: null,
    asset_name: shortName,
    asset_short_name: shortName,
    asset_image_url: null,
    asset_verified: true,
    inverse_fee: 993,
    liquidity_asset_id: `lp-${pairId}`,
    xch_reserve: 1_000_000_000_000,
    token_reserve: 2_000_000,
    liquidity: 500_000,
    last_coin_id_on_chain: "coin",
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
const initialFilterState = useOrderBookFilterStore.getState();
const originalTibetUrl = process.env.NEXT_PUBLIC_TIBET_API_URL;

const ENVIRONMENTS: Array<{
  label: string;
  network: "mainnet" | "testnet";
  nativeTicker: string;
}> = [
  { label: "mainnet", network: "mainnet", nativeTicker: "XCH" },
  { label: "testnet", network: "testnet", nativeTicker: "TXCH" },
];

describe("SwapTabContent across environments", () => {
  let requestedUrls: string[] = [];

  beforeEach(() => {
    requestedUrls = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/pairs")) {
        return jsonResponse([makePair("BYC", "pair-byc")]);
      }
      return jsonResponse({});
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useOrderBookFilterStore.setState(initialFilterState);
    localStorage.removeItem(NETWORK_STORAGE_KEY);
    if (originalTibetUrl === undefined) {
      delete process.env.NEXT_PUBLIC_TIBET_API_URL;
    } else {
      process.env.NEXT_PUBLIC_TIBET_API_URL = originalTibetUrl;
    }
    cleanup();
  });

  it.each(ENVIRONMENTS)(
    "renders swap, add and remove on $label",
    async ({ network, nativeTicker }) => {
      localStorage.setItem(NETWORK_STORAGE_KEY, network);
      useOrderBookFilterStore.setState({
        filters: { buyAsset: [nativeTicker], sellAsset: ["BYC"], status: [], pagination: 50 },
        searchValue: "",
        savedNetwork: null,
        userClearedFilters: false,
        _hasHydrated: true,
      });

      render(
        <SelectedOrderProvider>
          <SwapTabContent mode="inline" />
        </SelectedOrderProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Swap$/i })).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Add liquidity/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Remove$/i })).toBeInTheDocument();
    }
  );

  it.each(ENVIRONMENTS)("queries the configured Tibet API on $label", async ({ network }) => {
    process.env.NEXT_PUBLIC_TIBET_API_URL = "https://tibet.test";
    localStorage.setItem(NETWORK_STORAGE_KEY, network);
    useOrderBookFilterStore.setState({
      filters: { buyAsset: [], sellAsset: [], status: [], pagination: 50 },
      searchValue: "",
      savedNetwork: null,
      userClearedFilters: false,
      _hasHydrated: true,
    });

    render(
      <SelectedOrderProvider>
        <SwapTabContent mode="inline" />
      </SelectedOrderProvider>
    );

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.startsWith("https://tibet.test/pairs"))).toBe(true);
    });
  });
});
