import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { render, screen, waitFor, cleanup } from "@/test-utils";
import { SelectedOrderProvider } from "@/features/trading/hooks/SelectedOrderProvider";
import { useOrderBookFilterStore } from "@/features/trading/hooks/orderBookFilterStore";
import { SwapTabContent } from "./SwapTabContent";
import type { TibetApiPair } from "../lib/tibetTypes";

const PLACEHOLDER = /Select assets using the filter above/i;

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

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderSwapTab() {
  return render(
    <SelectedOrderProvider>
      <SwapTabContent mode="inline" />
    </SelectedOrderProvider>
  );
}

const initialFilterState = useOrderBookFilterStore.getState();

describe("SwapTabContent", () => {
  beforeEach(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/pairs")) {
        return jsonResponse([makePair("BYC", "pair-byc"), makePair("DBX", "pair-dbx")]);
      }
      return jsonResponse({});
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useOrderBookFilterStore.setState(initialFilterState);
    cleanup();
  });

  it("renders swap, add and remove for an already-selected Sell/Buy pair", async () => {
    useOrderBookFilterStore.setState({
      filters: { buyAsset: ["XCH"], sellAsset: ["BYC"], status: [], pagination: 50 },
      searchValue: "",
      savedNetwork: null,
      userClearedFilters: false,
      _hasHydrated: true,
    });

    renderSwapTab();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Swap$/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Add liquidity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Remove$/i })).toBeInTheDocument();
    expect(screen.queryByText(PLACEHOLDER)).toBeNull();
  });

  it("shows the placeholder when the selected assets are not a valid swap pair", async () => {
    useOrderBookFilterStore.setState({
      filters: { buyAsset: ["BYC"], sellAsset: ["DBX"], status: [], pagination: 50 },
      searchValue: "",
      savedNetwork: null,
      userClearedFilters: false,
      _hasHydrated: true,
    });

    renderSwapTab();

    expect(await screen.findByText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add liquidity/i })).toBeNull();
  });
});
