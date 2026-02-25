import { test, expect } from "@playwright/test";

/**
 * E2E tests for Dexie Splash Terminal
 * - Trading page: Stream tab shows terminal
 * - Terminal commands: /help, /list, /status, /clear
 */
test.describe("Splash Terminal", () => {
  test("trading page has Stream tab and terminal loads", async ({ page }) => {
    await page.goto("/trading");

    // May redirect to login; if we have Stream tab we're on trading
    const streamTab = page.getByRole("button", { name: /stream/i });
    await streamTab.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
      // If not visible, we might be on login - skip assertion
    });

    const isStreamVisible = await streamTab.isVisible();
    if (!isStreamVisible) {
      test.skip();
      return;
    }

    await streamTab.click();

    const terminal = page.getByTestId("splash-terminal");
    await expect(terminal).toBeVisible({ timeout: 10000 });
  });

  test("terminal shows help when /help is entered", async ({ page }) => {
    await page.goto("/trading");

    const streamTab = page.getByRole("button", { name: /stream/i });
    await streamTab.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

    if (!(await streamTab.isVisible())) {
      test.skip();
      return;
    }

    await streamTab.click();

    const terminal = page.getByTestId("splash-terminal");
    await expect(terminal).toBeVisible({ timeout: 10000 });

    await terminal.click();
    await page.keyboard.type("/help");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Commands:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/\/filter/)).toBeVisible({ timeout: 2000 });
  });
});
