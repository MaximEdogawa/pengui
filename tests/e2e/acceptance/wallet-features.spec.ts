import { test, expect } from "../fixtures";

/**
 * Acceptance Tests — Wallet-related pages (unauthenticated)
 *
 * Smoke tests already verify pages load without errors.
 * These tests check specific UI content visible before wallet connection.
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

test.describe("Offers page — live stream terminal toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");
  });

  test("'Show live stream terminal' button is present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /live stream terminal/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("clicking the button renders the terminal container", async ({ page }) => {
    const toggleBtn = page.getByRole("button", { name: /live stream terminal/i });
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 });
    await toggleBtn.click();

    await expect(page.getByTestId("splash-terminal")).toBeVisible({ timeout: 10_000 });
  });
});
