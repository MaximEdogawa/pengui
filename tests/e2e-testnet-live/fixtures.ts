/* eslint-disable react-hooks/rules-of-hooks, no-console */
/**
 * Fixtures for the `e2e-testnet-live` suite.
 *
 * One `TestnetLiveWallet` per worker (it holds a relay connection and the wasm
 * driver); every test gets a page already paired with it on `chia:testnet`. Tests
 * are skipped with an explicit reason when the environment is incomplete, but a
 * funded-but-underfunded wallet is a hard failure: the run must not silently do
 * nothing.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { authenticatePageWithWallet } from "../e2e/fixtures";
import { TestnetLiveWallet } from "./wallet/TestnetLiveWallet";

export function liveSuiteSkipReason(): string | null {
  if (!process.env.TESTNET_WALLET_MNEMONIC) {
    return "e2e-testnet-live needs TESTNET_WALLET_MNEMONIC (see tests/E2E_TESTNET_LIVE_SPEC.md)";
  }
  if (!(process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? process.env.WC_PROJECT_ID)) {
    return "e2e-testnet-live needs NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID to pair through the relay";
  }
  return null;
}

type LiveWorkerFixtures = {
  liveWallet: TestnetLiveWallet | null;
};

type LiveTestFixtures = {
  page: Page;
  wallet: TestnetLiveWallet;
};

export const test = base.extend<LiveTestFixtures, LiveWorkerFixtures>({
  liveWallet: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      if (liveSuiteSkipReason()) {
        await use(null);
        return;
      }

      const wallet = await TestnetLiveWallet.fromEnv();
      const balance = await wallet.assertFunded();
      const height = await wallet.node.getPeakHeight();
      console.log(
        `[e2e-testnet-live] wallet ${wallet.fingerprint} ${wallet.address} holds ${balance} mojos at peak ${height}`
      );
      await wallet.init();

      try {
        await use(wallet);
      } finally {
        await wallet.destroy();
        if (wallet.sends.length) {
          console.log("[e2e-testnet-live] broadcasts this run:", JSON.stringify(wallet.sends, null, 2));
        }
      }
    },
    { scope: "worker" },
  ],

  wallet: async ({ liveWallet }, use) => {
    const reason = liveSuiteSkipReason();
    if (!liveWallet) {
      base.skip(true, reason ?? "live wallet unavailable");
      return;
    }
    await use(liveWallet);
  },

  page: async ({ context, wallet }, use) => {
    const page = await context.newPage();
    try {
      await wallet.resetSessions();
      await authenticatePageWithWallet(page, wallet, { network: "testnet" });
      await use(page);
    } finally {
      await page.goto("about:blank").catch(() => {
        /* page may already be closing */
      });
      await wallet.resetSessions();
    }
  },
});

export { expect };
