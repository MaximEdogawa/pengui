/**
 * Trading page & TibetSwap E2E tests — authenticated via suite-level WalletConnect setup.
 *
 * ── Trading page layout ─────────────────────────────────────────────────────
 *   Top row: view-toggle buttons (plain <button>, NOT role="tab"):
 *     "Order Book" | "Chart" | "Depth" | "Trades" | "Stream"
 *   Right panel (desktop only, hidden lg:flex):
 *     LimitOfferTab buttons: "Limit" | "Market" | "Swap"
 *     The active tab's content renders below.
 *
 * ── External API mocks ──────────────────────────────────────────────────────
 *   Dexie: api.dexie.space  →  one XCH/USDS pair + one open offer
 *   Tibet: api.v2.tibetswap.io  →  tokens, pair, quote, offer response
 *
 * ── Note on mempool propagation ─────────────────────────────────────────────
 *   Tests verify the dApp sends the right RPC call and shows a success or
 *   pending state.  On-chain confirmation is NOT tested here.
 */

import { test, expect, MOCK } from "../fixtures/regression";

// ── Fixture data ───────────────────────────────────────────────────────────────

const USDS_ASSET_ID = "a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913";

const DEXIE_OFFER = {
  id: "dexie-offer-001",
  status: 4,
  offer: MOCK.OFFER_STR,
  price: 25.0,
  offered: [{ asset_id: null, amount: 1_000_000_000_000 }],
  requested: [{ asset_id: USDS_ASSET_ID, amount: 25_000_000 }],
  date_created: new Date().toISOString(),
};

const TIBET_PAIR = {
  pair_id: "tibet-pair-xch-usds",
  launcher_id: "tibet-pair-xch-usds",
  asset_id: USDS_ASSET_ID,
  asset_hidden_puzzle_hash: null,
  asset_name: "Stably USD",
  asset_short_name: "USDS",
  asset_image_url: null,
  asset_verified: true,
  liquidity_asset_id: "tibet-lp-xch-usds",
  xch_reserve: 100_000_000_000_000,
  token_reserve: 2_500_000_000,
  inverse_fee: 9_995,
  liquidity: 1_000_000_000,
  last_coin_id_on_chain: "0x1234abcd",
};

const TIBET_QUOTE = {
  amount_in: 1_000_000_000_000,
  amount_out: 24_500_000,
  price_warning: false,
  price_impact: 0.02,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Register all trading-page external API mocks. */
async function mockTradingApis(page: import("@playwright/test").Page) {
  // Dexie order book
  await page.route("**/api.dexie.space/**", (r) =>
    r.fulfill({ json: { offers: [DEXIE_OFFER], count: 1 } })
  );

  // Tibet swap
  await page.route("**/api.v2.tibetswap.io/tokens", (r) =>
    r.fulfill({
      json: [
        { asset_id: null, name: "Chia", short_name: "XCH" },
        { asset_id: USDS_ASSET_ID, name: "Stably USD", short_name: "USDS" },
      ],
    })
  );
  await page.route("**/api.v2.tibetswap.io/pairs", (r) => r.fulfill({ json: [TIBET_PAIR] }));
  await page.route("**/api.v2.tibetswap.io/pair/**", (r) => r.fulfill({ json: TIBET_PAIR }));
  await page.route("**/api.v2.tibetswap.io/quote/**", (r) => r.fulfill({ json: TIBET_QUOTE }));
  await page.route("**/api.v2.tibetswap.io/offer/**", (r) =>
    r.fulfill({ json: { success: true, offer_id: "tibet-offer-1" } })
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe("Authenticated — Trading page views", () => {
  test.slow();

  test("trading page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    expect(errors).toHaveLength(0);
  });

  test("all five view-toggle buttons are present", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // View buttons are plain <button> elements (NOT role="tab") in the top bar.
    for (const label of ["Order Book", "Chart", "Depth", "Trades", "Stream"]) {
      await expect(page.getByRole("button", { name: label }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("clicking Chart tab switches to chart view", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Chart" }).first().click();

    // PriceChart component is now rendered.  It should appear within the page.
    await expect(
      page.locator('[class*="chart" i], canvas, [data-testid*="chart"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Stream tab shows the StreamContainer with offer feed", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Stream" }).first().click();

    // StreamContainer (NOT SplashTerminal) renders on the trading page.
    // It shows connection status and an offer counter — both are reliable anchors.
    // When relay is configured: "X of Y offers"
    // When relay is absent: "Stream not available"
    await expect(
      page.getByText(/\d+\s+of\s+\d+\s+offer|Stream not available|Connecting|Disconnected/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Authenticated — Right panel (Limit / Market / Swap)", () => {
  test.slow();

  test("right panel Limit, Market, Swap buttons are present on desktop", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // These buttons are in TradingRightPanel → LimitOfferTab.
    // The panel is hidden on mobile (hidden lg:flex), but Playwright uses a desktop viewport by default.
    for (const label of ["Limit", "Market", "Swap"]) {
      await expect(page.getByRole("button", { name: label }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("clicking Swap in right panel shows Tibet SwapTabContent", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // Click the Swap button in the right-panel LimitOfferTab.
    const swapPanelBtn = page.getByRole("button", { name: "Swap" }).last();
    await expect(swapPanelBtn).toBeVisible({ timeout: 10_000 });
    await swapPanelBtn.click();

    // SwapTabContent renders a "Swap" action button and a pair selector.
    // Wait for the main Swap action button to appear inside the right panel.
    await expect(page.getByRole("button", { name: /^swap$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Authenticated — TibetSwap flow", () => {
  test.slow();

  test("Swap panel shows pair selector once Tibet pairs load", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Swap" }).last().click();

    // SwapTabContent uses useTibetPairs().  After mocked /pairs loads, the pair
    // selector or at least the "Sell" / "Buy" amount inputs should appear.
    const offeredInput = page
      .locator('[data-testid*="offered"], [placeholder*="Sell" i]')
      .or(page.locator('input[inputmode="decimal"]').first());
    await expect(offeredInput.first()).toBeVisible({ timeout: 15_000 });
  });

  test("swap flow: fill amount computes a quote and enables Swap", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Swap" }).last().click();

    // Wait for pair content to render.
    const offeredInput = page.locator('input[inputmode="decimal"]').first();
    await expect(offeredInput).toBeVisible({ timeout: 15_000 });
    await offeredInput.fill("1");

    // Quote request is debounced — wait for it.
    await page.waitForTimeout(1_500);

    const requestedInput = page.locator('input[inputmode="decimal"]').nth(1);
    await expect(requestedInput).toHaveValue(/\d/, { timeout: 10_000 });

    const swapBtn = page.getByRole("button", { name: /^swap$/i }).first();
    await expect(swapBtn).toBeEnabled({ timeout: 10_000 });
  });
});

test.describe("Authenticated — Take offer from Order Book", () => {
  test.slow();

  test("Market button in right panel opens the take-offer form", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // The "Market" panel button selects `currentMode = "taker"`.
    await page.getByRole("button", { name: "Market" }).first().click();

    // With no order selected, TradingRightPanel shows a plain "Market" button inside the panel.
    // That button is the secondary one that opens the Take Offer modal.
    const marketPanel = page
      .locator('[class*="rounded-lg"][class*="border"]')
      .filter({ hasText: /market|click an offer/i })
      .first();

    await expect(marketPanel).toBeVisible({ timeout: 10_000 });
  });
});
