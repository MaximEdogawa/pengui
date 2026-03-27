import { test, expect } from "../fixtures";

/**
 * Acceptance Tests — Splash Terminal
 *
 * The xterm-based Splash Terminal lives on the /offers page behind a
 * "Show live stream terminal" toggle button, NOT on the trading page.
 *
 * The trading page "Stream" tab shows a StreamContainer (live trade table),
 * which is a separate component with no data-testid="splash-terminal".
 */

test.describe("Splash Terminal — /offers page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");
  });

  test("toggle button is visible before the terminal is open", async ({ page }) => {
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

test.describe("Trading page — Stream tab", () => {
  test("Stream tab shows the live trade stream (not xterm terminal)", async ({ page }) => {
    await page.goto("/trading");
    await page.waitForLoadState("domcontentloaded");

    const streamTab = page.getByRole("button", { name: /stream/i });
    await expect(streamTab).toBeVisible({ timeout: 10_000 });
    await streamTab.click();

    // The Stream tab renders StreamContainer (a trade history table), not the xterm terminal
    await expect(page.getByTestId("splash-terminal")).not.toBeAttached();
  });
});
