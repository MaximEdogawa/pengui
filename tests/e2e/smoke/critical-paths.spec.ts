import { test, expect } from "../fixtures";

/**
 * Smoke Tests — fast critical-path checks that run on every PR.
 *
 * Rules:
 *  - No wallet connection required
 *  - Must complete in < 5 minutes total
 *  - Each test must make at least one meaningful assertion (not just "body not empty")
 */

test.describe("Smoke — Login Page", () => {
  test("renders heading, connect button, and sage link", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.expectVisible();
  });

  test("connect button is present in the DOM", async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.connectButton).toBeVisible();
  });

  test("title contains 'pengui'", async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.page).toHaveTitle(/pengui/i);
  });

  test("no JS exceptions on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    expect(errors).toHaveLength(0);
  });
});

test.describe("Smoke — Home Route", () => {
  test("/ renders the login page (same component as /login)", async ({ loginPage }) => {
    // app/page.tsx re-exports the login page — URL stays at /
    await loginPage.page.goto("/");
    await loginPage.page.waitForLoadState("domcontentloaded");

    // Same UI as /login must be visible
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.connectButton).toBeVisible();
  });
});

test.describe("Smoke — App Routes", () => {
  for (const route of ["/trading", "/offers", "/wallet"]) {
    test(`${route} loads without a 500 error`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      await expect(page).not.toHaveURL(/500/);
      expect(pageErrors).toHaveLength(0);
    });
  }

  test("unknown route does not produce a 500", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).not.toHaveURL(/500/);
  });
});
