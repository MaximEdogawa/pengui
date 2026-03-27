import { test, expect, MOCK } from "../fixtures/regression";

/**
 * Authenticated E2E Tests — Wallet Connected
 *
 * These tests require a live WalletConnect relay and a project ID.
 * They are automatically skipped when WC_PROJECT_ID /
 * NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set.
 *
 * The suite-level authenticated fixture handles the full WalletConnect setup
 * via SageMockWallet before each test.
 *
 * Run locally:
 *   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<id> bunx playwright test tests/e2e/regression
 */

test.describe("Authenticated — Dashboard", () => {
  test.slow(); // Triple the default timeout for WalletConnect round-trips.

  test("redirects to /dashboard after wallet connect", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard page loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Trigger a navigation to ensure listeners are in place for page errors.
    await page.waitForLoadState("domcontentloaded");

    expect(errors).toHaveLength(0);
  });

  test("dashboard does not show a 500 error page", async ({ page }) => {
    await expect(page).not.toHaveURL(/500|error/);
  });
});

test.describe("Authenticated — Header wallet button", () => {
  test.slow();

  test("wallet button is present after connection", async ({ page }) => {
    // SafeConnectButton renders aria-label="Manage wallet" when connected.
    await expect(page.getByRole("button", { name: /manage wallet/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("wallet button shows shortened address", async ({ page }) => {
    // shortAddress = address.slice(0,6) + "…" + address.slice(-4)
    const shortAddr = `${MOCK.ADDRESS.slice(0, 6)}…${MOCK.ADDRESS.slice(-4)}`;

    await expect(page.getByRole("button", { name: /manage wallet/i })).toContainText(shortAddr, {
      timeout: 10_000,
    });
  });

  test("disconnect removes wallet session", async ({ page }) => {
    // Open the dropdown.
    await page.getByRole("button", { name: /manage wallet/i }).click();

    // Click Disconnect.
    await page.getByRole("button", { name: /disconnect/i }).click();

    // Disconnect clears wallet state but keeps the user on /dashboard.
    // The wallet button keeps aria-label="Manage wallet" but its visible text
    // reverts from the shortened address to "Connect" when isConnected=false.
    const walletButton = page.getByRole("button", { name: /manage wallet/i });
    await expect(walletButton).toContainText("Connect", { timeout: 10_000 });
  });
});

test.describe("Authenticated — Wallet page", () => {
  test.slow();

  test("wallet page renders when authenticated", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/wallet");
    await page.waitForLoadState("domcontentloaded");

    expect(pageErrors).toHaveLength(0);
    await expect(page).not.toHaveURL(/500|error/);
  });
});
