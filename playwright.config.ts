import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env / .env.local so NEXT_PUBLIC_* vars are available to the Playwright
// Node.js process — Next.js loads them for the app server automatically, but
// the test runner is a separate process that needs them too (e.g. WC project ID).
loadEnvConfig(process.cwd());

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 *
 * Test tiers
 * ──────────
 * • smoke/        — fast page-load / render checks, run on every PR
 * • regression/   — authenticated WalletConnect user flows via SageMockWallet,
 *                   run on every PR when WC_PROJECT_ID /
 *                   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is present
 * • acceptance/   — feature behaviour, mostly unauthenticated, run on every PR
 */
export default defineConfig({
  testDir: "./tests/e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in source. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Limit workers on CI to avoid relay rate-limits.
     Cap at 4 locally — more than 4 parallel WalletConnect sessions causes
     "No matching key" relay errors when tests are tearing down sessions. */
  workers: process.env.CI ? 2 : 4,

  /* Default per-test timeout.  Authenticated tests call test.slow() to
     triple this (60 s) for WalletConnect relay round-trips. */
  timeout: 20_000,

  /* Reporter */
  reporter: [["html"], ["list"], ...(process.env.CI ? [["github"] as const] : [])],

  /* Shared browser settings */
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. */
    trace: "on-first-retry",

    /* Screenshot / video on failure */
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Faster navigation — don't wait for all network requests to settle.
       Individual tests that need more stability use waitForLoadState(). */
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },

  /* Configure projects for major browsers.
     Chromium-only for fast CI; add webkit/firefox locally if needed. */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run the dev server before tests (reuse if already running locally). */
  webServer: {
    command: process.env.CI ? "bun run start" : "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
