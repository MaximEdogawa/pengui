import { expect, test } from "@playwright/experimental-ct-react";
import { LoginFormStory } from "./stories/LoginFormStory";

/**
 * Component tests for the login screen in both wallet runtimes (TASK-001.05 AC #3).
 *
 * WalletConnect mode renders the QR/pairing flow; Sage mode connects straight
 * through the (mock) Sage bridge without a QR code. The bun/happy-dom twin is
 * `src/features/auth/ui/LoginForm.test.tsx`.
 */

test.describe("LoginForm — WalletConnect mode", () => {
  test("renders the pairing connect button, network picker and Sage link", async ({ mount }) => {
    const component = await mount(<LoginFormStory runtime="walletconnect" />);

    await expect(component.getByRole("heading", { name: /pengui/i })).toBeVisible();
    await expect(component.getByRole("button", { name: /connect/i })).toBeVisible();
    await expect(component.getByText(/Connect with Sage Wallet/i)).toBeVisible();
    await expect(component.getByText(/Connecting to Sage/i)).toHaveCount(0);
    await expect(component.getByLabel(/set by Sage/i)).toHaveCount(0);
  });
});

test.describe("LoginForm — Sage mode", () => {
  test("connects without a QR code and shows Sage's network read-only", async ({ mount }) => {
    const component = await mount(
      <LoginFormStory runtime="sage-bridge" sage={{ networkId: "testnet11" }} />
    );

    await expect(component.getByText(/Connected — redirecting/i)).toBeVisible();
    await expect(component.getByText(/Connect with Sage Wallet/i)).toHaveCount(0);
    await expect(component.getByRole("button", { name: /connect wallet/i })).toHaveCount(0);
    await expect(component.getByLabel(/Network: Testnet \(set by Sage\)/i)).toBeVisible();
  });

  test("shows the bridge error and a retry button when Sage has no wallet", async ({ mount }) => {
    const component = await mount(
      <LoginFormStory
        runtime="sage-bridge"
        sage={{ key: null, receiveAddress: null, grantable: [] }}
      />
    );

    await expect(component.getByText(/no wallet identity/i)).toBeVisible();
    await expect(component.getByRole("button", { name: /retry/i })).toBeVisible();
    await expect(component.getByText(/Connected — redirecting/i)).toHaveCount(0);
  });

  test("retry reconnects once the host has a wallet again", async ({ mount, page }) => {
    const component = await mount(
      <LoginFormStory
        runtime="sage-bridge"
        sage={{ key: null, receiveAddress: null, grantable: [] }}
      />
    );
    await expect(component.getByRole("button", { name: /retry/i })).toBeVisible();

    // The user selects a wallet in Sage; drive the installed mock from the page.
    await page.evaluate(() => {
      const client = (window as unknown as { __SAGE__: { wallet: Record<string, unknown> } }).__SAGE__;
      client.wallet.getSyncStatus = async () => ({
        selectable_balance: "0",
        unit: { ticker: "XCH", precision: 12 },
        synced_coins: 0,
        total_coins: 0,
        receive_address: "xch1recoveredaddress",
        burn_address: "xch1burn",
        unhardened_derivation_index: 0,
        hardened_derivation_index: 0,
        checked_files: 0,
        total_files: 0,
        database_size: 0,
      });
    });
    await component.getByRole("button", { name: /retry/i }).click();

    await expect(component.getByText(/Connected — redirecting/i)).toBeVisible();
  });
});
