import type { Page, Locator } from "@playwright/test";

/**
 * Page Object for the Trading page (/trading).
 *
 * ── Layout ──────────────────────────────────────────────────────────────────
 * Top:   view-toggle buttons  (plain <button>, NOT role="tab")
 *          Order Book | Chart | Depth | Trades | Stream
 *
 * Right panel (desktop, hidden lg:flex):
 *          LimitOfferTab buttons:  Limit | Market | Swap
 *          Below:  active-mode content (CreateOfferForm / MarketOfferContent / SwapTabContent)
 *
 * ── TakeOfferModal (from offers page or mobile) ──────────────────────────
 *   <h2>Take Offer</h2>
 *   <textarea placeholder="Paste offer string here...">
 *   <button type="submit">Take Offer</button>
 */
export class TradingPage {
  readonly page: Page;

  // ── View tabs (top bar) ───────────────────────────────────────────────────

  readonly orderBookBtn: Locator;
  readonly chartBtn: Locator;
  readonly depthBtn: Locator;
  readonly tradesBtn: Locator;
  readonly streamBtn: Locator;

  // ── Right panel mode buttons ──────────────────────────────────────────────

  readonly limitBtn: Locator;
  readonly marketBtn: Locator;
  readonly swapBtn: Locator;

  // ── Swap form ─────────────────────────────────────────────────────────────

  /** Main "Swap" action button inside SwapFormBody */
  readonly swapActionBtn: Locator;

  // ── TakeOfferModal ────────────────────────────────────────────────────────

  /** textarea in MarketOfferFormInputs (shown when no order is pre-selected) */
  readonly offerStringTextarea: Locator;

  /** Submit button inside MarketOfferActions */
  readonly takeOfferBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.orderBookBtn = page.getByRole("button", { name: "Order Book" }).first();
    this.chartBtn = page.getByRole("button", { name: "Chart" }).first();
    this.depthBtn = page.getByRole("button", { name: "Depth" }).first();
    this.tradesBtn = page.getByRole("button", { name: "Trades" }).first();
    this.streamBtn = page.getByRole("button", { name: "Stream" }).first();

    this.limitBtn = page.getByRole("button", { name: "Limit" }).first();
    this.marketBtn = page.getByRole("button", { name: "Market" }).first();
    // Swap button — use `last()` to prefer the right-panel instance over mobile.
    this.swapBtn = page.getByRole("button", { name: "Swap" }).last();

    this.swapActionBtn = page.getByRole("button", { name: /^swap$/i }).first();
    this.offerStringTextarea = page.locator('textarea[placeholder*="Paste offer string"]');
    this.takeOfferBtn = page.getByRole("button", { name: /^take offer$/i }).last();
  }

  async goto() {
    await this.page.goto("/trading");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Register page.route() mocks for all external trading APIs.
   * Call this before goto() so route mocks are in place before any fetch.
   */
  async mockExternalApis(offerFixture?: unknown) {
    const USDS_ASSET_ID = "a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913";

    const dexieResponse = {
      offers: offerFixture ? [offerFixture] : [],
      count: offerFixture ? 1 : 0,
    };

    await this.page.route("**/api.dexie.app/**", (r) => r.fulfill({ json: dexieResponse }));
    await this.page.route("**/api.dexie.space/**", (r) => r.fulfill({ json: dexieResponse }));

    await this.page.route("**/api.v2.tibetswap.io/tokens", (r) =>
      r.fulfill({
        json: [
          { asset_id: null, name: "Chia", short_name: "XCH" },
          { asset_id: USDS_ASSET_ID, name: "Stably USD", short_name: "USDS" },
        ],
      })
    );
    await this.page.route("**/api.v2.tibetswap.io/pairs", (r) =>
      r.fulfill({
        json: [
          {
            launcher_id: "tibet-pair-xch-usds",
            asset_id: USDS_ASSET_ID,
            liquidity_asset_id: "tibet-lp-xch-usds",
            xch_reserve: "100000000000000",
            token_reserve: "2500000000",
            fee: 5,
          },
        ],
      })
    );
    await this.page.route("**/api.v2.tibetswap.io/pair/**", (r) =>
      r.fulfill({
        json: {
          launcher_id: "tibet-pair-xch-usds",
          asset_id: USDS_ASSET_ID,
          liquidity_asset_id: "tibet-lp-xch-usds",
          xch_reserve: "100000000000000",
          token_reserve: "2500000000",
          fee: 5,
        },
      })
    );
    await this.page.route("**/api.v2.tibetswap.io/quote/**", (r) =>
      r.fulfill({
        json: {
          amount_in: 1_000_000_000_000,
          amount_out: 24_500_000,
          price_warning: false,
          price_impact: 0.02,
        },
      })
    );
    await this.page.route("**/api.v2.tibetswap.io/offer/**", (r) =>
      r.fulfill({ json: { success: true, offer_id: "tibet-offer-1" } })
    );
  }
}
