import { test, expect } from "../fixtures";

test.describe("Testnet — Edge cases", () => {
  test.slow();

  test("network label reflects testnet mode after connection", async ({ testnetConnectedPage }) => {
    await expect(testnetConnectedPage.getByText(/testnet/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("T-007 insufficient balance shows the correct error message", async () => {
    test.fixme(
      true,
      "Blocked on selecting a deterministic low-balance test wallet or adding a targeted RPC override path for this scenario."
    );
  });

  test("T-009 session disconnect mid-flow shows a reconnect prompt", async () => {
    test.fixme(
      true,
      "Blocked on a deterministic disconnect hook for the WalletConnect session used by the testnet fixture."
    );
  });

  test("T-010 switching between mainnet and testnet updates the full wallet session state", async () => {
    test.fixme(
      true,
      "Partially covered by the current testnet label assertion, but real wallet-side network switching is still not automated."
    );
  });
});
