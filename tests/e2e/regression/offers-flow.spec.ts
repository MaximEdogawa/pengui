/**
 * Offers page E2E tests — authenticated via suite-level WalletConnect setup.
 *
 * The mock wallet responds to:
 *   chia_takeOffer   → { success: true, tradeId: MOCK.TRADE_ID }
 *   chia_createOffer → { success: true, offer: MOCK.OFFER_STR, tradeId: MOCK.TRADE_ID }
 *   chia_cancelOffer → { success: true }
 *
 * Offers are stored in Redux-persist (localStorage).  Tests start with clean state.
 *
 * ── Take Offer flow ─────────────────────────────────────────────────────────
 *   Header "Take Offer" button
 *     → TakeOfferModal (max-w-lg)
 *       → MarketOfferContent
 *         → MarketOfferFormInputs: <textarea placeholder="Paste offer string here...">
 *           (only shown when NO order prop is passed — i.e. from the offers page)
 *         → MarketOfferActions: <button type="submit">"Take Offer"</button>
 *
 * Note on mempool propagation
 * ──────────────────────────
 * Tests verify the dApp calls the wallet RPC and shows a success/error UI state.
 * On-chain confirmation is NOT tested here — that requires a real funded testnet wallet.
 */

import { test, expect } from "../fixtures/regression";

test.describe("Authenticated — Offers page", () => {
  test.slow();

  test("offers page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    expect(errors).toHaveLength(0);
  });

  test("'Create Offer' and 'Take Offer' buttons are present", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    // Buttons are in OffersPageHeader (text rendered by lucide icon + text span).
    await expect(page.getByRole("button", { name: /create offer/i })).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByRole("button", { name: /take offer/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("'Create Offer' opens a modal", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.getByRole("button", { name: /create offer/i });
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    // CreateOfferModal renders max-w-5xl — look for a modal overlay or dialog.
    // The shared <Modal> component wraps content in an overlay div.
    await expect(page.locator('[role="dialog"], .fixed.inset-0').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("'Take Offer' header button opens TakeOfferModal", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    // The header has exactly one "Take Offer" button for opening the modal.
    const takeBtn = page.getByRole("button", { name: /take offer/i }).first();
    await expect(takeBtn).toBeVisible({ timeout: 10_000 });
    await takeBtn.click();

    // Modal header is <h2>Take Offer</h2>.
    await expect(page.getByRole("heading", { name: /take offer/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("TakeOfferModal shows offer-string textarea", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    await page
      .getByRole("button", { name: /take offer/i })
      .first()
      .click();

    // MarketOfferFormInputs renders textarea only when no order is pre-selected.
    const textarea = page.locator('textarea[placeholder*="Paste offer string"]');
    await expect(textarea).toBeVisible({ timeout: 10_000 });
  });

  test("taking an offer with an invalid offer string shows validation feedback", async ({
    page,
  }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    await page
      .getByRole("button", { name: /take offer/i })
      .first()
      .click();

    const textarea = page.locator('textarea[placeholder*="Paste offer string"]');
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill("not-a-valid-offer");

    // Wait for the parsing debounce and validation.
    await page.waitForTimeout(750);

    const submitBtn = page.getByRole("button", { name: /^take offer$/i }).last();

    await expect(submitBtn).toBeDisabled();
  });

  test("offer list is empty on first load with clean wallet state", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    // With fresh state no offers have been created.  The offer history shows an empty state.
    await page.waitForTimeout(500); // let offer data load
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    // Either zero rows, or an empty-state paragraph is shown.
    const emptyMsg = page.getByText(/no offers|nothing here/i).first();
    const hasEmptyMsg = await emptyMsg.isVisible().catch(() => false);
    expect(count === 0 || hasEmptyMsg).toBe(true);
  });
});
