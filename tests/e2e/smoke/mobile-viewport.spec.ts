import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile viewport guards (TASK-013.02).
 *
 * The app shell used to hide its own breakage: `body` carried `overflow-x-hidden`, so
 * anything overflowing horizontally — including the `100vw` widths that overflow by
 * definition, because `100vw` counts the classic scrollbar — was clipped rather than
 * visible. Nothing could fail, so nothing did.
 *
 * With that blanket rule gone, horizontal overflow is a real symptom again, and this is
 * the check that keeps it that way. It is deliberately in the smoke tier: it needs no
 * wallet, no fixtures and no network beyond the app itself, and it runs on every PR.
 */

/** Phone widths worth holding the line at: small, common, and large. */
const PHONE_VIEWPORTS = [
  { name: "320px (smallest supported)", width: 320, height: 568 },
  { name: "375px (iPhone SE / 13 mini)", width: 375, height: 667 },
  { name: "414px (iPhone Plus / Max)", width: 414, height: 896 },
] as const;

/**
 * Routes reachable without a wallet. The wallet guard redirects the authenticated ones
 * to /login, which is still a real render and still must not overflow.
 */
const ROUTES = ["/login", "/", "/dashboard", "/trading", "/offers", "/wallet"] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      // Name the widest offender, so a failure says what to fix rather than just that
      // something is too wide.
      widest: (() => {
        let worst = { tag: "", width: 0, cls: "" };
        for (const element of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
          const rect = element.getBoundingClientRect();
          const right = rect.right;
          if (right > worst.width) {
            worst = {
              tag: element.tagName.toLowerCase(),
              width: Math.round(right),
              cls: String(element.className).slice(0, 120),
            };
          }
        }
        return worst;
      })(),
    };
  });
}

for (const viewport of PHONE_VIEWPORTS) {
  test.describe(`No horizontal overflow at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} fits the viewport`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle").catch(() => {
          /* Third-party polling can keep the network busy; the DOM is what matters. */
        });

        const { scrollWidth, clientWidth, widest } = await horizontalOverflow(page);

        expect(
          scrollWidth,
          `${route} overflows by ${scrollWidth - clientWidth}px at ${viewport.width}px. ` +
            `Widest element: <${widest.tag} class="${widest.cls}"> reaching ${widest.width}px.`
        ).toBeLessThanOrEqual(clientWidth);
      });
    }
  });
}

test.describe("Viewport configuration", () => {
  test("pinch-zoom is not disabled", async ({ page }) => {
    await page.goto("/login");

    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content")
      .catch(() => null);

    // WCAG 2.1 SC 1.4.4: users must be able to resize content. Blocking zoom through the
    // viewport meta is the most common way of failing it, and it was failing here.
    expect(content ?? "").not.toContain("user-scalable=no");
    expect(content ?? "").not.toMatch(/maximum-scale=\s*1\b/);
  });

  test("the shell does not pin the layout viewport, so zoomed content can pan", async ({
    page,
  }) => {
    await page.goto("/login");

    const pinned = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement).position;
      const body = getComputedStyle(document.body).position;
      return { html, body };
    });

    // `position: fixed` on html/body leaves pinch-zoomed content nowhere to pan to, so
    // zooming clips the page instead of revealing it.
    expect(pinned.html).not.toBe("fixed");
    expect(pinned.body).not.toBe("fixed");
  });
});
