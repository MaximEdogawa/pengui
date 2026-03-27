import { test, expect } from "../fixtures";

/**
 * Regression Tests — verify that previously fixed bugs do not reoccur.
 *
 * Naming convention: AREA-NNN: short description
 * Each test should reference the GitHub issue or PR that introduced the fix.
 *
 * NOTE: Do not duplicate assertions already covered by smoke tests.
 * Regression tests focus on the specific scenario that was broken.
 */

test.describe("Regression — Navigation", () => {
  /**
   * NAV-001: Unknown routes previously crashed with an unhandled exception
   * instead of rendering a Next.js 404 page.
   */
  test("NAV-001: 404 for unknown routes — no unhandled exception", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/this-page-does-not-exist-xyz");
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
    await expect(page).not.toHaveURL(/500/);
  });
});

test.describe("Regression — Login Page", () => {
  /**
   * LOGIN-001: After a branding update the footer link text was incorrectly
   * changed to just "Sage Wallet" — verify the full expected label is restored.
   */
  test("LOGIN-001: footer link reads 'Connect with Sage Wallet'", async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.connectWithSageLink).toBeVisible();
    await expect(loginPage.connectWithSageLink).toHaveAttribute("href", /sagewallet/i);
  });
});

test.describe("Regression — Trading Page", () => {
  /**
   * TRADING-001: lightweight-charts threw a runtime exception during
   * initialisation when the container element was not yet in the DOM.
   */
  test("TRADING-001: trading page initialises without a JS exception", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/trading");
    // Use domcontentloaded — networkidle would hang on open WebSocket connections.
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
  });

  /**
   * TRADING-002: Stream tab was absent from the navigation bar after a
   * view-state refactor that dropped the "terminal" entry from the views array.
   */
  test("TRADING-002: Stream tab is present in trading view selector", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    // The tab may not render until the component is mounted (useEffect sets mounted=true).
    const streamTab = page.getByRole("button", { name: /stream/i });
    await expect(streamTab).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Regression — Offers Page", () => {
  /**
   * OFFERS-001: The offers page previously showed a blank screen when the
   * wallet was disconnected because a missing null-check threw before render.
   */
  test("OFFERS-001: offers page renders without wallet connection", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
    await expect(page).not.toHaveURL(/500|error/);
  });
});

test.describe("Regression — Wallet Page", () => {
  /**
   * WALLET-001: The wallet page threw a runtime error on cold start when
   * WalletConnect session was absent from the Redux store.
   */
  test("WALLET-001: wallet page handles missing session without crashing", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/wallet");
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
  });
});
