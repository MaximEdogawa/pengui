/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Playwright fixture extensions — page objects and authenticated pages.
 *
 * The `use` parameter below is Playwright's fixture mechanism, not React's
 * `use` hook.  The react-hooks/rules-of-hooks rule is disabled for this file.
 *
 * Fixtures
 * ────────
 *  loginPage          – LoginPage POM (unauthenticated)
 *  dashboardPage      – DashboardPage POM (unauthenticated helper)
 *  connectedPage      – Authenticated page via SageMockWallet (mock data)
 *
 * Usage
 * ─────
 *  import { test, expect } from "../fixtures";
 *
 *  // Unauthenticated:
 *  test("my test", async ({ loginPage }) => { ... });
 *
 *  // Mock-authenticated (no real WC wallet needed except project ID):
 *  test("my test", async ({ connectedPage }) => { ... });
 */
import { test as base, expect, type Page } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { DashboardPage } from "../page-objects/DashboardPage";
import { SageMockWallet } from "../wallet-mock/SageMockWallet";

export type E2EFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  /** Mock-authenticated page — uses SageMockWallet with fixture data. */
  connectedPage: Page;
};

export const test = base.extend<E2EFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  // ── connectedPage ────────────────────────────────────────────────────────

  /**
   * Sets up a fully-authenticated browser session using SageMockWallet.
   * All 17 Sage RPC methods return deterministic fixture data.
   *
   * Requires: NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID or WC_PROJECT_ID env var.
   * Skips the test automatically when no project ID is found.
   */
  connectedPage: async ({ page }, use) => {
    const projectId =
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? process.env.WC_PROJECT_ID;

    if (!projectId) {
      test.skip(
        true,
        "Authenticated tests require WC_PROJECT_ID or NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID"
      );
      await use(page);
      return;
    }

    await connectWithWallet(page, new SageMockWallet(), use);
  },
});

// ── Shared connect helper ──────────────────────────────────────────────────

/**
 * Shared logic for connecting any SageMockWallet (or subclass) to the dApp.
 *
 *  1. Clears localStorage (removes stale WalletConnect + Redux state).
 *  2. Navigates to /login, waits for Connect Wallet button to be enabled.
 *  3. Clicks the button to open the QR modal.
 *  4. Reads the pairing URI from [data-testid="wc-pairing-uri"].
 *  5. Pairs the mock wallet — it auto-approves the session.
 *  6. Waits for WalletConnectionGuard to redirect to /dashboard.
 */
export async function authenticatePageWithWallet(
  page: Page,
  wallet: SageMockWallet
): Promise<void> {
  // ── 1. Clear persisted state ───────────────────────────────────────────
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── 2. Reload and wait for Connect Wallet button ───────────────────────
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  const loginPage = new LoginPage(page);
  await loginPage.waitForReady(15_000);

  // ── 3. Open QR modal ───────────────────────────────────────────────────
  await loginPage.connectButton.click();

  // ── 4. Read pairing URI ────────────────────────────────────────────────
  // ConnectWalletModal renders:
  //   <span data-testid="wc-pairing-uri" data-uri="wc:..." aria-hidden class="sr-only">
  const uriLocator = page.locator('[data-testid="wc-pairing-uri"]');
  await uriLocator.waitFor({ state: "attached", timeout: 25_000 });
  const uri = await uriLocator.getAttribute("data-uri");

  if (!uri) {
    throw new Error(
      "connectWithWallet: no pairing URI found — was ConnectWalletModal updated with data-testid?"
    );
  }

  // ── 5. Pair the mock wallet ────────────────────────────────────────────
  await wallet.pair(uri);

  // ── 6. Wait for redirect to /dashboard ────────────────────────────────
  // WalletConnectionGuard redirects ~2 s after isConnected → true on /login.
  await page.waitForURL("**/dashboard**", { timeout: 35_000 });
}

export async function teardownWalletSession(
  page: Page,
  wallet: SageMockWallet
): Promise<void> {
  await page.goto("about:blank").catch(() => {
    /* page may already be closing */
  });
  await wallet.destroy();
}

export async function connectWithWallet(
  page: Page,
  wallet: SageMockWallet,
  use: (page: Page) => Promise<void>
): Promise<void> {
  await wallet.init();
  await authenticatePageWithWallet(page, wallet);

  await use(page);

  // ── Teardown ───────────────────────────────────────────────────────────
  await teardownWalletSession(page, wallet);
}

export { expect };
export { MOCK } from "../wallet-mock/responses";
