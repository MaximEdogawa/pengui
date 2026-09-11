/**
 * e2e-testnet-live — the app against a real, funded testnet11 wallet.
 *
 * Proves what the fixture-backed tiers cannot: the key behind the WalletConnect
 * session is real, the balance comes from the chain, and a transfer the UI submits
 * is signed by that key, accepted by a full node and confirmed in a block.
 *
 * Costs real TXCH (a 0.001 TXCH self-transfer plus the form's default fee) and takes minutes because
 * it waits for block confirmation, so it only runs on demand or on a schedule —
 * never as part of `bun run test:e2e`.
 */
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

const TRANSFER_TXCH = "0.001";
const TRANSFER_MOJOS = BigInt("1000000000");

test.describe.configure({ mode: "serial" });

/** Keep third-party token/price lookups out of the picture; this suite is about the wallet and the chain. */
async function mockExternalApis(page: Page) {
  await page.route("**/api/spacescan/tokens**", (route) =>
    route.fulfill({ json: { status: "success", data: [] } })
  );
  await page.route("**/api*.spacescan.io/**", (route) =>
    route.fulfill({ json: { status: "success", data: [] } })
  );
  await page.route("**/api*.dexie.space/**", (route) =>
    route.fulfill({ json: { offers: [], count: 0 } })
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** `1.100181754150` mojos → a regex matching how the UI may round it: `1.1…`, `1.10…`, `1.1002 TXCH`. */
function balancePattern(mojos: bigint): RegExp {
  const whole = mojos / BigInt("1000000000000");
  const fraction = (mojos % BigInt("1000000000000")).toString().padStart(12, "0").replace(/0+$/, "");
  const firstDigit = fraction.slice(0, 1);
  return fraction ?
      new RegExp(`\\b${whole}\\.${firstDigit}\\d*\\s*T?XCH\\b`)
    : new RegExp(`\\b${whole}(?:\\.0+)?\\s*T?XCH\\b`);
}

test.describe("e2e-testnet-live — connect", () => {
  test("pairs on chia:testnet and shows the real fingerprint, address and network", async ({
    page,
    wallet,
  }) => {
    await mockExternalApis(page);
    await expect(page).toHaveURL(/\/dashboard/);

    const walletButton = page.getByRole("button", { name: /manage wallet/i });
    await expect(walletButton).toBeVisible({ timeout: 15_000 });
    await expect(walletButton).toContainText(shortAddress(wallet.address), { timeout: 15_000 });

    await expect(page.getByRole("button", { name: "Select network" })).toContainText(/testnet/i, {
      timeout: 15_000,
    });

    // The approved session carries the real fingerprint on the testnet chain, not the fixture one.
    expect(wallet.sessionAccounts()).toContain(`chia:testnet:${wallet.fingerprint}`);
  });
});

test.describe("e2e-testnet-live — balance", () => {
  test("shows the balance the chain reports for the wallet", async ({ page, wallet }) => {
    await mockExternalApis(page);
    const chainBalance = await wallet.getBalanceMojos();
    expect(chainBalance).toBeGreaterThan(BigInt("0"));

    await page.getByRole("link", { name: "Wallet" }).click();
    await page.waitForURL("**/wallet", { timeout: 15_000 });

    const xchRow = page.locator('a[href*="/wallet/xch"]').first();
    await expect(xchRow).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(balancePattern(chainBalance)).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("e2e-testnet-live — transfer", () => {
  test("a 0.001 TXCH self-transfer submitted in the UI is signed, broadcast and confirmed", async ({
    page,
    wallet,
  }) => {
    test.setTimeout(6 * 60_000);
    await mockExternalApis(page);

    const before = await wallet.getBalanceMojos();
    expect(before).toBeGreaterThan(TRANSFER_MOJOS);

    // Warm the balance on /wallet first (client-side), then open the XCH detail page the
    // way the regression suite does: a direct load restores the WalletConnect session from
    // storage, whereas clicking the asset row has proven flaky under Playwright.
    await page.getByRole("link", { name: "Wallet" }).click();
    await page.waitForURL("**/wallet", { timeout: 15_000 });
    await expect(page.locator('a[href*="/wallet/xch"]').first()).toBeVisible({ timeout: 20_000 });
    await page.goto("/wallet/xch");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(balancePattern(before)).first()).toBeVisible({ timeout: 30_000 });

    const sendButton = page.getByRole("button", { name: /^send$/i }).first();
    await expect(sendButton).toBeVisible({ timeout: 20_000 });
    await sendButton.click();

    const addressInput = page.locator('input[placeholder="xch1..."]');
    await expect(addressInput).toBeVisible({ timeout: 10_000 });
    await addressInput.fill(wallet.address);
    await addressInput.blur();

    const amountInput = page.locator('input[inputmode="decimal"]').first();
    await amountInput.fill(TRANSFER_TXCH);
    await amountInput.blur();

    const submit = page.getByRole("button", { name: /send transaction/i });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();

    // Signing plus push_tx round trip through the relay: allow a generous window.
    await expect(page.getByText(/transaction sent successfully/i)).toBeVisible({ timeout: 90_000 });

    const send = wallet.sends.at(-1);
    expect(send, "the wallet peer recorded the broadcast").toBeDefined();
    expect(send!.method).toBe("chia_send");
    expect(send!.amount).toBe(TRANSFER_MOJOS.toString());
    await expect(page.getByText(send!.transactionId.slice(0, 8))).toBeVisible({ timeout: 10_000 });

    // The node accepted the bundle (push_tx resolved SUCCESS). It is either still in the
    // mempool or, on a fast block, already spent; only the confirmation below is binding.
    const inMempool = await wallet.node.isInMempool(send!.transactionId);
    // eslint-disable-next-line no-console
    console.log(`[e2e-testnet-live] ${send!.transactionId} in mempool: ${inMempool}`);

    // Confirmation: the coin the transfer spent shows up as spent on chain.
    const spent = await wallet.node.waitForSpent(send!.spentCoinIds[0], { timeoutMs: 4 * 60_000 });
    expect(spent.spent).toBe(true);
    // eslint-disable-next-line no-console
    console.log(
      `[e2e-testnet-live] transfer ${send!.transactionId} confirmed in block ${spent.spent_block_index}`
    );

    // A self-transfer only costs the fee the form applied (its default is 0.000001 TXCH).
    const after = await wallet.getBalanceMojos();
    expect(after).toBe(before - BigInt(send!.fee));
  });
});
