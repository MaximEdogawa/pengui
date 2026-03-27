import { test, expect } from "../fixtures";

test.describe("Testnet — Offers", () => {
  test.slow();

  test("offers page renders for a connected testnet wallet", async ({ testnetConnectedPage }) => {
    const errors: string[] = [];
    testnetConnectedPage.on("pageerror", (err) => errors.push(err.message));

    await testnetConnectedPage.goto("/offers");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    await expect(testnetConnectedPage.getByRole("button", { name: /create offer/i })).toBeVisible({
      timeout: 10_000,
    });

    expect(errors).toHaveLength(0);
  });

  test("create offer modal opens on testnet", async ({ testnetConnectedPage }) => {
    await testnetConnectedPage.goto("/offers");
    await testnetConnectedPage.waitForLoadState("domcontentloaded");

    const createBtn = testnetConnectedPage.getByRole("button", { name: /create offer/i });
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    await expect(
      testnetConnectedPage.locator('[role="dialog"], .fixed.inset-0').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("T-004 create offer with real signing and verify it appears in My Offers", async () => {
    test.fixme(
      true,
      "Blocked on Phase 2 real testnet signing. The current TestnetSageWallet still inherits from SageMockWallet."
    );
  });

  test("T-005 cancel offer and verify cancelled status", async () => {
    test.fixme(
      true,
      "Blocked on Phase 2 real offer lifecycle support and deterministic persisted offer state."
    );
  });

  test("T-006 upload offer to Dexie and verify remote visibility", async () => {
    test.fixme(true, "Blocked on real offer creation plus reliable Dexie testnet verification.");
  });
});
