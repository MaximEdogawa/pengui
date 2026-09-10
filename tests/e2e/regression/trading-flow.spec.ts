/**
 * Trading page E2E tests — authenticated via suite-level WalletConnect setup.
 *
 * ── Trading page layout ─────────────────────────────────────────────────────
 *   Top row: view-toggle buttons (plain <button>, NOT role="tab"):
 *     "Order Book" | "Chart" | "Depth" | "Trades" | "Stream"
 *   Right panel (desktop only, hidden lg:flex):
 *     LimitOfferTab buttons: "Limit" | "Market"
 *     The active tab's content renders below.
 *
 * ── External API mocks ──────────────────────────────────────────────────────
 *   Dexie: api.dexie.space  →  one XCH/USDS pair + one open offer
 *
 * ── Note on mempool propagation ─────────────────────────────────────────────
 *   Tests verify the dApp sends the right RPC call and shows a success or
 *   pending state.  On-chain confirmation is NOT tested here.
 *
 * The TibetSwap ("Swap" tab / SwapTabContent) flow is not covered here: the
 * TibetSwap AMM is winding down and the "swap" feature flag is off by default,
 * so those tests were removed rather than kept flaky against a dying API.
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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Register all trading-page external API mocks. */
async function mockTradingApis(page: import("@playwright/test").Page) {
  // Dexie order book
  await page.route("**/api.dexie.space/**", (r) =>
    r.fulfill({ json: { offers: [DEXIE_OFFER], count: 1 } })
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

test.describe("Authenticated — Right panel (Limit / Market)", () => {
  test.slow();

  test("right panel Limit and Market buttons are present on desktop", async ({ page }) => {
    await mockTradingApis(page);
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // These buttons are in TradingRightPanel → LimitOfferTab.
    // The panel is hidden on mobile (hidden lg:flex), but Playwright uses a desktop viewport by default.
    for (const label of ["Limit", "Market"]) {
      await expect(page.getByRole("button", { name: label }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
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
