import { test, expect } from "../fixtures";

/**
 * Acceptance Tests — Authentication / Login page
 *
 * Smoke tests already verify the page loads and key elements are visible.
 * These tests cover attributes and behaviour that smoke tests don't check.
 */

test.describe("Auth — Footer link attributes", () => {
  test("'Connect with Sage Wallet' link opens sagewallet.net in a new secure tab", async ({
    loginPage,
  }) => {
    await loginPage.goto();
    await expect(loginPage.connectWithSageLink).toHaveAttribute("href", /sagewallet/i);
    await expect(loginPage.connectWithSageLink).toHaveAttribute("target", "_blank");
    await expect(loginPage.connectWithSageLink).toHaveAttribute("rel", /noopener/i);
  });
});

test.describe("Auth — Network picker", () => {
  test("network picker button is visible and accessible", async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.networkPicker).toBeVisible();
  });

  test("network picker shows current network label (Mainnet or Testnet)", async ({ loginPage }) => {
    await loginPage.goto();
    const text = await loginPage.networkPicker.textContent();
    expect(text).toMatch(/mainnet|testnet/i);
  });
});

test.describe("Auth — Connect Wallet button behaviour", () => {
  test("clicking connect button while initialising does not navigate away", async ({
    loginPage,
  }) => {
    await loginPage.goto();
    const initialUrl = loginPage.page.url();
    // Force-click even when disabled — must never cause navigation
    await loginPage.connectButton.click({ force: true });
    await expect(loginPage.page).toHaveURL(initialUrl);
  });
});
