/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Playwright fixture extensions — page objects injected into every test.
 *
 * The `use` parameter below is Playwright's fixture mechanism, not React's
 * `use` hook.  The react-hooks/rules-of-hooks rule is disabled for this file.
 *
 * Usage:
 *   import { test, expect } from "../fixtures";
 *   test("my test", async ({ loginPage }) => { ... });
 */
import { test as base, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { DashboardPage } from "../page-objects/DashboardPage";

export type E2EFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<E2EFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
