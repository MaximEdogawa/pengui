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

test("client-side navigation works without a server or SPA fallback", async ({ page }) => {
  const captured = capture(page);

  await page.goto("/", { waitUntil: "load" });
  await page.waitForLoadState("networkidle");

  // A hard navigation would 404: the snapshot server, like Sage, resolves only the
  // manifest entry at "/" and otherwise only exact file paths. Reaching /dashboard with
  // rendered content therefore proves the Next.js client router took over.
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "/dashboard";
    link.id = "sage-test-nav";
    document.body.appendChild(link);
  });
  await page.click("#sage-test-nav");

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe("/dashboard");
  await expect(page.locator("body")).not.toContainText("not in manifest files[]");
  expect(captured.cspViolations, captured.cspViolations.join("\n")).toEqual([]);
});

test("the asset detail route resolves from a query parameter", async ({ page }) => {
  const captured = capture(page);

  const response = await page.goto("/wallet/asset.html?id=xch", { waitUntil: "load" });
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle");

  expect(captured.cspViolations, captured.cspViolations.join("\n")).toEqual([]);
});
