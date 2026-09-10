import { defineConfig, devices } from "@playwright/test";

/**
 * Sage snapshot checks (`bun run test:sage`).
 *
 * Serves the snapshot built by `bun run build:sage` through
 * scripts/sage/serve-snapshot.ts, which applies the exact Content-Security-Policy Sage
 * puts on its app protocol and resolves only files listed in sage-manifest.json. It is
 * the closest automated proxy for "installs into Sage and hydrates" that exists without
 * a Sage desktop build; see pengui-wiki/architecture/sage-in-app-integration.md.
 */
export default defineConfig({
  testDir: "./tests/sage",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Use the system-installed Google Chrome instead of Playwright's bundled Chromium: this
  // sandbox has no headless-shell download available, and the CSP behaviour under test
  // (script-src / connect-src / img-src enforcement) is the same Chromium engine either way.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],

  webServer: {
    command: "bun run scripts/sage/serve-snapshot.ts --dir out --port 4173",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
