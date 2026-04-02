import { test, expect } from "../fixtures";

test.describe("Testnet — Wallet connect and balance", () => {
  test.slow();

  test("dashboard renders with testnet network label", async ({ testnetConnectedPage }) => {
    expect(testnetConnectedPage.url()).toContain("/dashboard");

    await expect(testnetConnectedPage.getByText(/testnet/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("header shows the real testnet address (truncated)", async ({ testnetConnectedPage }) => {
    const address = process.env.TESTNET_WALLET_ADDRESS ?? "";
    const addrStart = address.slice(0, 6);

    await expect(testnetConnectedPage.getByText(new RegExp(addrStart)).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("wallet page shows non-zero TXCH balance", async ({ testnetConnectedPage }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    await expect(testnetConnectedPage.getByText(/[1-9]\d*(\.\d+)?\s+XCH/).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("wallet page shows TXCH ticker when on testnet", async ({ testnetConnectedPage }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    await expect(testnetConnectedPage.getByText(/TXCH/).first()).toBeVisible({ timeout: 20_000 });
  });

  test("navigating to wallet detail page works on testnet", async ({ testnetConnectedPage }) => {
    await testnetConnectedPage.route("**/api/spacescan/tokens**", (route) =>
      route.fulfill({ json: { status: "success", data: [] } })
    );

    await testnetConnectedPage.goto("/wallet");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    const xchEntry = testnetConnectedPage.getByText(/TXCH/).first();
    await expect(xchEntry).toBeVisible({ timeout: 20_000 });
    await xchEntry.click();

    await expect(testnetConnectedPage).toHaveURL(/\/wallet\/xch/, { timeout: 10_000 });
  });
});
