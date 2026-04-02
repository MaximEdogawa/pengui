import type { Page, Locator } from "@playwright/test";

/**
 * Page Object for the Wallet pages.
 *
 * Asset list:    /wallet
 * Asset detail:  /wallet/xch  (XCH)
 *                /wallet/{assetId}  (CAT)
 *
 * The SendTransactionForm is on the asset detail page, NOT the list page.
 */
export class WalletPage {
  readonly page: Page;

  // ── Asset list page (/wallet) ─────────────────────────────────────────────

  /** XCH balance text — matches "5.000000 XCH" format from AssetPane.formatBalance */
  readonly xchBalance: Locator;

  // ── Asset detail page (/wallet/xch) ──────────────────────────────────────

  /** Recipient address input.  placeholder="xch1..." */
  readonly recipientInput: Locator;

  /**
   * Amount input.
   * type="text" inputMode="decimal" (NOT type="number")
   * label="Amount (XCH)" or "Amount (TICKER)"
   */
  readonly amountInput: Locator;

  /** Submit button — text = "Send Transaction" */
  readonly sendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.xchBalance = page.getByText(/\d+\.\d+\s+XCH/).first();
    this.recipientInput = page.locator('input[placeholder="xch1..."]');
    this.amountInput = page.locator('input[inputmode="decimal"]').first();
    this.sendButton = page.getByRole("button", { name: /send transaction/i });
  }

  /** Navigate to the asset list page. */
  async goto() {
    await this.page.goto("/wallet");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /** Navigate to the XCH asset detail page. */
  async gotoXch() {
    await this.page.goto("/wallet/xch");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /** Block SpaceScan CAT-discovery so only XCH appears. */
  async blockCatDiscovery() {
    await this.page.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );
  }

  /** Fill and submit the send form.  Returns after clicking "Send Transaction". */
  async fillAndSend(recipientAddress: string, amount: string) {
    await this.recipientInput.fill(recipientAddress);
    await this.amountInput.fill(amount);
    await this.sendButton.click();
  }
}
