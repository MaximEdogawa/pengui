/**
 * Wallet page E2E tests — authenticated via suite-level WalletConnect setup.
 *
 * The mock wallet returns:
 *   chip0002_getAssetBalance → 5 XCH (5_000_000_000_000 mojos confirmed / spendable)
 *   chia_getAddress          → MOCK.ADDRESS  (xch1...)
 *   chia_send                → { success: true, transactionId: MOCK.TX_ID }
 *
 * ── Navigation strategy ──────────────────────────────────────────────────────
 *   Tests use CLIENT-SIDE navigation (clicking nav links) instead of
 *   page.goto() to keep the WalletConnect session alive in memory.
 *   page.goto() causes a full page reload which requires WC re-establishment
 *   from localStorage — this is unreliable and slow (>25s).
 *
 * ── Balance caching strategy ─────────────────────────────────────────────────
 *   The fixture starts on /dashboard which renders BalanceCard → useWalletAssets
 *   → useWalletBalance.  We wait for the balance to load on the dashboard BEFORE
 *   navigating to /wallet so the React Query cache is warmed.
 *   This avoids a race where the wallet page fires a fresh WC request before the
 *   cache is populated.
 *
 * ── Send Transaction UI structure ────────────────────────────────────────────
 *   AssetDetailView renders action buttons in the card header:
 *     <button>Send</button>  (opens Modal on click)
 *   Inside the Modal:
 *     <SendTransactionForm>
 *       <input placeholder="xch1...">        — recipient address
 *       <input inputmode="decimal">           — amount
 *       <button>Send Transaction</button>     — submit
 *
 * External API mock:
 *   /api/spacescan/tokens → empty list so only XCH appears
 *   SpaceScan address/token-balance → empty (prevent slow direct-API timeout)
 *   Dexie tickers → empty (prevent isLoadingTickers from blocking)
 */

import { test, expect, MOCK } from "../fixtures/regression";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Block all SpaceScan / Dexie calls that would stall isLoading. */
async function mockExternalApis(page: import("@playwright/test").Page) {
  // Internal Next.js proxy for CAT token list
  await page.route("**/api/spacescan/tokens**", (route) =>
    route.fulfill({ json: { status: "success", data: [] } })
  );
  // Direct SpaceScan address balance (wallet page calls this directly)
  await page.route("**/api.spacescan.io/**", (route) =>
    route.fulfill({ json: { status: "success", data: [] } })
  );
  await page.route("**/api-testnet11.spacescan.io/**", (route) =>
    route.fulfill({ json: { status: "success", data: [] } })
  );
  // Dexie tickers (useCatTokens)
  await page.route("**/api.dexie.app/**", (route) =>
    route.fulfill({ json: { offers: [], count: 0 } })
  );
  await page.route("**/api-testnet.dexie.space/**", (route) =>
    route.fulfill({ json: { offers: [], count: 0 } })
  );
}

/**
 * Navigate to /wallet via the sidebar link (client-side navigation).
 */
async function goToWallet(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Wallet" }).click();
  await page.waitForURL("**/wallet", { timeout: 10_000 });
  await page.waitForLoadState("domcontentloaded");
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe("Authenticated — Wallet asset list", () => {
  test.slow();

  test("wallet page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await mockExternalApis(page);
    await goToWallet(page);

    expect(errors).toHaveLength(0);
  });

  test("XCH appears in the asset list with balance", async ({ page }) => {
    await mockExternalApis(page);
    await goToWallet(page);

    // Cache is already warm from dashboard; XCH asset link should appear quickly.
    // Use the asset list AppLink (href="/wallet/xch") rather than the header balance span.
    await expect(page.locator('a[href*="/wallet/xch"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("wallet list shows the connected address somewhere on the page", async ({ page }) => {
    await mockExternalApis(page);
    await goToWallet(page);

    // Address is visible at minimum in the header wallet button.
    const addrStart = MOCK.ADDRESS.slice(0, 6);
    await expect(page.getByText(new RegExp(addrStart)).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("XCH asset row links to /wallet/xch", async ({ page }) => {
    await mockExternalApis(page);
    await goToWallet(page);

    const xchLink = page.locator('a[href*="/wallet/xch"]').first();
    await expect(xchLink).toBeVisible({ timeout: 15_000 });
    await expect(xchLink).toHaveAttribute("href", /\/wallet\/xch$/);
  });
});

test.describe("Authenticated — Send transaction form", () => {
  test.slow();

  /**
   * Warm the wallet balance cache on /wallet, then navigate directly to /wallet/xch.
   * The warm-up avoids the asset detail page rendering with a transient zero balance.
   */
  async function goToXchDetail(page: import("@playwright/test").Page) {
    await mockExternalApis(page);
    await goToWallet(page);
    await expect(page.locator('a[href*="/wallet/xch"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/wallet/xch");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/5(?:\.0+)?\s+XCH/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /^send$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  test("send form opens when clicking Send on the XCH asset detail page", async ({ page }) => {
    await goToXchDetail(page);

    // The "Send" button is always visible in the card header row
    // (it opens a Modal containing SendTransactionForm on click).
    const sendBtn = page.getByRole("button", { name: /^send$/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await sendBtn.click();

    // SendTransactionForm is now rendered inside the modal.
    await expect(page.getByRole("button", { name: /send transaction/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("send form validates an invalid recipient address", async ({ page }) => {
    await goToXchDetail(page);

    // Open the send modal by clicking the "Send" action button.
    const sendBtn = page.getByRole("button", { name: /^send$/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await sendBtn.click();

    // Fill invalid address and blur to trigger validation.
    const addressInput = page.locator('input[placeholder="xch1..."]');
    await expect(addressInput).toBeVisible({ timeout: 10_000 });
    await addressInput.fill("not-a-valid-address");
    await addressInput.blur();

    // useTransactionForm sets addressError = "Invalid Chia address format" on blur.
    await expect(page.getByText("Invalid Chia address format")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("send transaction succeeds when wallet approves", async ({ page }) => {
    await goToXchDetail(page);

    // Open the send modal.
    const sendBtn = page.getByRole("button", { name: /^send$/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await sendBtn.click();

    // Fill a valid 62-char XCH address (regex: ^xch1[a-z0-9]{58}$).
    // isValidChiaAddress requires exactly 58 chars after "xch1".
    const addressInput = page.locator('input[placeholder="xch1..."]');
    await expect(addressInput).toBeVisible({ timeout: 10_000 });
    await addressInput.fill(`xch1${"q".repeat(54)}zqgp`);
    await addressInput.blur();

    // Amount input — label is "Amount (XCH)", type="text" inputMode="decimal".
    const amountInput = page.locator('input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible({ timeout: 5_000 });
    await amountInput.fill("0.001");
    await amountInput.blur();

    const submitButton = page.getByRole("button", { name: /send transaction/i });
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();

    // SageMockWallet returns { success: true, transactionId: MOCK.TX_ID }.
    // SendTransactionForm shows: "Transaction sent successfully! Transaction ID: ..."
    await expect(page.getByText(/transaction sent successfully/i)).toBeVisible({ timeout: 20_000 });
  });
});
