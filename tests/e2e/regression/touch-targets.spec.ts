import { test, expect } from "../fixtures";

/**
 * Touch-target guards (TASK-013.04).
 *
 * Measured at 375px with a coarse pointer, every interactive element in the app was below
 * the 44px minimum — heights clustered between 19px and 38px. The `tap-target` utility in
 * globals.css now enforces it for the shared primitives and the header controls.
 *
 * This locks in what was fixed. It deliberately does NOT assert app-wide compliance:
 * roughly 100 raw `<button>` elements across feature code bypass the shared `Button` and
 * are still under 44px. Asserting the whole app would fail, and weakening the threshold to
 * make it pass would make the guard worthless. The remaining surfaces are listed in
 * pengui-wiki/development/design-system.md under "Not yet done".
 */

const MIN_TOUCH_TARGET = 44;

test.use({ viewport: { width: 375, height: 780 }, hasTouch: true, isMobile: true });

/** Controls present on every authenticated screen, so they matter most. */
const ALWAYS_PRESENT = [
  // The trigger's accessible name comes from shadcn's sr-only span, not an aria-label.
  { label: "sidebar trigger", selector: 'button:has-text("Toggle Sidebar")' },
  { label: "network picker", selector: 'button:has-text("Mainnet")' },
];

for (const control of ALWAYS_PRESENT) {
  test(`${control.label} meets the touch minimum`, async ({ connectedPage }) => {
    await connectedPage.goto("/dashboard");
    await connectedPage.waitForLoadState("domcontentloaded");
    await connectedPage.waitForTimeout(1500);

    const box = await connectedPage.locator(control.selector).first().boundingBox();
    expect(box, `${control.label} not found`).not.toBeNull();
    expect(
      Math.min(box!.width, box!.height),
      `${control.label} is ${Math.round(box!.width)}x${Math.round(box!.height)}, ` +
        `below the ${MIN_TOUCH_TARGET}px minimum`
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
}

test("the shared Button primitive carries the touch floor", async ({ connectedPage }) => {
  await connectedPage.goto("/dashboard");
  await connectedPage.waitForLoadState("domcontentloaded");
  await connectedPage.waitForTimeout(1500);

  // Any element that opted into the utility must actually receive the minimum, which also
  // proves the coarse-pointer media query matches under touch emulation.
  const tapTargets = connectedPage.locator(".tap-target");
  const count = await tapTargets.count();
  expect(
    count,
    "no .tap-target elements rendered — the utility is not reaching the DOM"
  ).toBeGreaterThan(0);

  const boxes = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const element = tapTargets.nth(index);
      return (await element.isVisible()) ? element.boundingBox() : null;
    })
  );

  boxes
    .filter((box): box is NonNullable<typeof box> => box !== null)
    .forEach((box) => {
      expect(
        Math.min(box.width, box.height),
        `a .tap-target element is ${Math.round(box.width)}x${Math.round(box.height)}`
      ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
});
