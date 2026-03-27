import { test, expect } from "../fixtures";

/**
 * Acceptance Tests — Wallet-related pages (unauthenticated)
 *
 * Smoke tests verify pages load; these tests check specific UI behaviour
 * visible before wallet connection.
 */

test.describe("Trading page — view tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Order Book tab is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /order book/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Chart tab is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /chart/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Stream tab is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /stream/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Stream tab renders trade stream, not xterm terminal", async ({ page }) => {
    await page.getByRole("button", { name: /stream/i }).click();
    // StreamContainer is a trade-history table — data-testid="splash-terminal" belongs
    // to the xterm terminal on /offers, not here.
    await expect(page.getByTestId("splash-terminal")).not.toBeAttached();
  });
});

test.describe("Offers page — live stream terminal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");
  });

  test("'Show live stream terminal' toggle button is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /live stream terminal/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("clicking the toggle shows the terminal container", async ({ page }) => {
    await page.getByRole("button", { name: /live stream terminal/i }).click();
    await expect(page.getByTestId("splash-terminal")).toBeVisible({ timeout: 10_000 });
  });

  test("clicking the toggle again hides the terminal", async ({ page }) => {
    const btn = page.getByRole("button", { name: /live stream terminal/i });
    await btn.click();
    await expect(page.getByTestId("splash-terminal")).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await expect(page.getByTestId("splash-terminal")).not.toBeVisible();
  });
});
