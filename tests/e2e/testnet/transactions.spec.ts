import { test, expect } from "../fixtures";

test.describe("Testnet — Transactions", () => {
  test.slow();

  test("send form renders on /wallet/xch when testnet wallet is connected", async ({
    testnetConnectedPage,
  }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet/xch");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    await expect(
      testnetConnectedPage.getByRole("button", { name: /send transaction/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("address validation rejects an invalid address on testnet", async ({
    testnetConnectedPage,
  }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet/xch");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    const addressInput = testnetConnectedPage.locator('input[placeholder*="ch1"]');
    await expect(addressInput).toBeVisible({ timeout: 15_000 });
    await addressInput.fill("not-a-valid-bech32-address");
    await addressInput.blur();

    await expect(testnetConnectedPage.getByText(/invalid.*address|address.*invalid/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("send transaction succeeds with the current phase-1 mock signer", async ({
    testnetConnectedPage,
  }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet/xch");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    const recipientAddress = process.env.TESTNET_WALLET_ADDRESS ?? "";
    const addressInput = testnetConnectedPage.locator('input[placeholder*="ch1"]');
    await expect(addressInput).toBeVisible({ timeout: 15_000 });
    await addressInput.fill(recipientAddress);

    const amountInput = testnetConnectedPage.locator('input[inputmode="decimal"]').first();
    await expect(amountInput).toBeVisible({ timeout: 5_000 });
    await amountInput.fill("0.0001");

    await testnetConnectedPage.getByRole("button", { name: /send transaction/i }).click();

    await expect(testnetConnectedPage.getByText(/transaction sent successfully/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
