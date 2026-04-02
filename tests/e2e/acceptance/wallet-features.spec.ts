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
});
