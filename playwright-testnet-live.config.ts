import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// .env / .env.local carry the WalletConnect project id and, locally, the
// TESTNET_WALLET_* values that CI provides as secrets.
loadEnvConfig(process.cwd());

/**
 * `e2e-testnet-live` (`bun run test:e2e:testnet-live`).
 *
 * The app against a real, funded testnet11 wallet (tests/e2e-testnet-live). It
 * spends TXCH and waits for block confirmation, so it is deliberately not part
 * of `bun run test:e2e`: one worker, no retries (a retried transfer is a second
 * transfer), long timeouts, and it skips itself when TESTNET_WALLET_MNEMONIC or
 * the WalletConnect project id is missing. See tests/E2E_TESTNET_LIVE_SPEC.md.
 */
export default defineConfig({
  testDir: "./tests/e2e-testnet-live",
  outputDir: "./test-results-testnet-live",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-testnet-live-report", open: "never" }],
    ...(process.env.CI ? [["github"] as const] : []),
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: process.env.CI ? "bun run start" : "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
