import { test, expect } from "../fixtures";

/**
 * Every authenticated route, at phone widths, must fit (TASK-013.03).
 *
 * The smoke tier's mobile-viewport suite covers the unauthenticated shell. This one
 * covers what the app actually looks like once a wallet is connected — the order book,
 * balance cards, offer tables and asset detail — which is where the dense content lives
 * and where narrow-viewport problems actually show up.
 *
 * It lives in the regression tier because it needs the mock wallet.
 *
 * This became meaningful only once `<main>`'s `overflow-x-hidden` was removed: while
 * that rule was in place the content area clipped its own overflow, so no measurement
 * could ever see it.
 */

const ROUTES = [
  "/dashboard",
  "/trading",
  "/offers",
  "/wallet",
  "/wallet/asset",
  "/loans",
  "/option-contracts",
  "/piggy-bank",
  "/profile",
] as const;

const WIDTHS = [320, 375, 414] as const;

for (const width of WIDTHS) {
  test.describe(`Authenticated routes at ${width}px`, () => {
    test.use({ viewport: { width, height: 780 } });

    for (const route of ROUTES) {
      test(`${route} fits without horizontal overflow`, async ({ connectedPage }) => {
        await connectedPage.goto(route);
        await connectedPage.waitForLoadState("domcontentloaded");
        // Charts and lists settle asynchronously; measure after they have laid out.
        await connectedPage.waitForTimeout(1200);

        const result = await connectedPage.evaluate(() => {
          const doc = document.documentElement;
          const viewportWidth = doc.clientWidth;

          // Name the worst offender inside the content area, so a failure points at the
          // element to fix instead of just reporting a number.
          let worst = { tag: "", right: 0, cls: "" };
          const main = document.querySelector("main");
          for (const element of Array.from(main?.querySelectorAll<HTMLElement>("*") ?? [])) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.right > worst.right) {
              worst = {
                tag: element.tagName.toLowerCase(),
                right: Math.round(rect.right),
                cls: String(element.className).slice(0, 100),
              };
            }
          }

          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: viewportWidth,
            worst,
          };
        });

        expect(
          result.scrollWidth,
          `${route} overflows by ${result.scrollWidth - result.clientWidth}px at ${width}px. ` +
            `Widest in <main>: <${result.worst.tag} class="${result.worst.cls}"> ` +
            `reaching ${result.worst.right}px.`
        ).toBeLessThanOrEqual(result.clientWidth);
      });
    }
  });
}
