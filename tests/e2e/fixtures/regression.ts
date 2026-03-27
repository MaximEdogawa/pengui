/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, MOCK, authenticatePageWithWallet } from "./index";
import { SageMockWallet } from "../wallet-mock/SageMockWallet";
import type { Page } from "@playwright/test";

type RegressionTestFixtures = {
  page: Page;
};

type RegressionWorkerFixtures = {
  regressionWallet: SageMockWallet | null;
};

export const test = base.extend<RegressionTestFixtures, RegressionWorkerFixtures>({
  regressionWallet: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const projectId =
        process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? process.env.WC_PROJECT_ID;

      if (!projectId) {
        await use(null);
        return;
      }

      const wallet = new SageMockWallet();
      await wallet.init();

      try {
        await use(wallet);
      } finally {
        await wallet.destroy();
      }
    },
    { scope: "worker" },
  ],

  page: async ({ context, regressionWallet }, use) => {
    if (!regressionWallet) {
      base.skip(
        true,
        "Regression tests require WC_PROJECT_ID or NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID"
      );
      return;
    }

    const page = await context.newPage();

    try {
      await regressionWallet.resetSessions();
      await authenticatePageWithWallet(page, regressionWallet);
      await use(page);
    } finally {
      // Navigate away to reduce stray WalletConnect traffic during context close.
      await page.goto("about:blank").catch(() => {
        /* page may already be closing */
      });
      await regressionWallet.resetSessions();
    }
  },
});

export { expect, MOCK };
