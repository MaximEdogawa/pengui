import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { buildAppCspForManifest } from "../../scripts/sage/csp";
import type { SageManifest } from "../../scripts/sage/manifestSchema";

/**
 * The snapshot produced by `bun run build:sage`, served under Sage's app-protocol CSP
 * with only the files listed in sage-manifest.json resolvable — no server, no SPA
 * fallback. These tests fail on any CSP violation and prove the page hydrates, which is
 * what the previous Vite attempt could not do (see the wiki page).
 */

const manifest = JSON.parse(readFileSync("out/sage-manifest.json", "utf8")) as SageManifest;

/** Chromium reports blocked resources as "Refused to …" console errors. */
const CSP_VIOLATION = /Refused to (load|execute|apply|connect|frame|run)|Content Security Policy/i;

interface Captured {
  messages: string[];
  cspViolations: string[];
  pageErrors: string[];
}

function capture(page: Page): Captured {
  const captured: Captured = { messages: [], cspViolations: [], pageErrors: [] };
  page.on("console", (message: ConsoleMessage) => {
    const text = `[${message.type()}] ${message.text()}`;
    captured.messages.push(text);
    if (CSP_VIOLATION.test(message.text())) captured.cspViolations.push(text);
  });
  page.on("pageerror", (error) => captured.pageErrors.push(error.message));
  return captured;
}

test("every response carries the Sage app CSP", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toBe(buildAppCspForManifest(manifest));
});

test("the entry page loads and hydrates with no CSP violation", async ({ page }) => {
  const captured = capture(page);

  await page.goto("/", { waitUntil: "load" });
  await page.waitForLoadState("networkidle");

  // React 19 tags every hydrated host node with a fiber property; if the CSP had blocked
  // a script or the flight payload, nothing would be tagged.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.body.firstElementChild;
          return root ? Object.keys(root).some((key) => key.startsWith("__react")) : false;
        }),
      { timeout: 20_000, message: "React never hydrated the document" }
    )
    .toBe(true);

  expect(captured.cspViolations, captured.cspViolations.join("\n")).toEqual([]);
  expect(captured.pageErrors, captured.pageErrors.join("\n")).toEqual([]);
});

test("there is no SPA fallback: a hard navigation to an unmapped route 404s", async ({ page }) => {
  // Exactly Sage's behaviour: "/" resolves to the manifest entry and every other path
  // must be an exact listed file — no directory index, no rewrite, no catch-all. A hard
  // reload or a deep link to a route that isn't a real file in the snapshot must 404
  // instead of silently falling back to index.html, which would hide routes that rely on
  // client-side-only navigation. /some/unmapped/route is not a file in out/.
  const response = await page.goto("/some/unmapped/route", { waitUntil: "load" });
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toContainText("not in manifest files[]");
});

// Clicking an in-app <Link> to prove the Next.js client router (rather than a hard
// navigation) serves every route past the entry page needs an authenticated session —
// every route here is behind WalletConnectionGuard, which renders no internal <a href>
// at all before connecting (verified: "/", "/login", "/dashboard" and "/wallet" expose
// zero same-origin anchors pre-auth). That is TASK-001.05's mock Sage bridge harness.

test("the asset detail route resolves from a query parameter", async ({ page }) => {
  const captured = capture(page);

  const response = await page.goto("/wallet/asset.html?id=xch", { waitUntil: "load" });
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle");

  expect(captured.cspViolations, captured.cspViolations.join("\n")).toEqual([]);
});
