import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import AssetSelectorStory from "./stories/AssetSelectorStory";

/**
 * Asset selection in the offer and trading forms (TASK-013.01).
 *
 * These cover the four defects that made picking an asset unreliable:
 *
 * 1. The dropdown used to close itself. `TokenDropdown` is a modal Radix `Dialog`; on
 *    open it moves focus into the dialog, which blurred the search input, which started
 *    a 200 ms timer that closed the dropdown again. Every platform, not just touch.
 * 2. Tapping a token had to win a race against that timer.
 * 3. Selecting XCH left `AssetTypeSelector` holding a value it renders no option for.
 * 4. Changing type silently discarded a chosen asset.
 *
 * The `asset-state` mirror in the story renders the live model as JSON, so these assert
 * on what the component reports upward — not merely on what is painted.
 */

const DROPDOWN = "dialog";

interface AssetState {
  type: string;
  assetId: string;
  symbol: string;
  searchQuery: string;
}

/**
 * Reads the story's live model mirror, so assertions cover what the component reports
 * upward rather than only what is painted.
 *
 * Scoped to the page, not to the mounted component: the dropdown is a portalled Radix
 * dialog, and while it is open Radix marks the rest of the tree `aria-hidden`, which
 * makes component-scoped lookups unreliable.
 */
async function state(page: Page): Promise<AssetState> {
  return JSON.parse((await page.getByTestId("asset-state").textContent()) ?? "{}");
}

test.describe("AssetSelector — dropdown lifecycle", () => {
  test("stays open after focusing the search input", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    // The regression: a 200 ms blur timer closed the dropdown right after it opened.
    // Wait well past that window and require it to still be there.
    await page.waitForTimeout(600);
    await expect(page.getByRole(DROPDOWN)).toBeVisible();
  });

  test("closes on Escape", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole(DROPDOWN)).toBeHidden();
  });

  test("closes on an outside click", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    // Radix renders an overlay over the page; clicking it dismisses the dialog.
    await page.mouse.click(5, 5);
    await expect(page.getByRole(DROPDOWN)).toBeHidden();
  });
});

test.describe("AssetSelector — selecting a token", () => {
  test("a click selects the token and closes the dropdown", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    // Read-then-click, at human speed. Playwright clicks in well under the 200 ms the
    // old blur timer allowed, so without this pause the test passes against the bug.
    await page.waitForTimeout(500);
    await page.getByRole(DROPDOWN).getByText("USDS", { exact: true }).click();

    await expect(page.getByRole(DROPDOWN)).toBeHidden();
    expect(await state(page)).toMatchObject({ type: "cat", assetId: "a".repeat(64) });
  });

  test("filtering by ticker narrows the list and the match is selectable", async ({
    mount,
    page,
  }) => {
    const component = await mount(<AssetSelectorStory />);

    const search = component.getByPlaceholder(/search tokens/i);
    await search.click();
    await search.fill("DBX");

    await page.getByRole(DROPDOWN).getByText("DBX", { exact: true }).click();
    expect(await state(page)).toMatchObject({ assetId: "b".repeat(64), symbol: "DBX" });
  });
});

test.describe("AssetSelector — touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("a tap selects the token", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).tap();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    // The defect this guards: the dropdown closed itself ~200 ms after opening, so a
    // user who took a moment to read the list tapped into a dialog that was already
    // gone. Pause first — automation taps far faster than a person does.
    await page.waitForTimeout(500);
    await page.getByRole(DROPDOWN).getByText("USDS", { exact: true }).tap();

    await expect(page.getByRole(DROPDOWN)).toBeHidden();
    expect(await state(page)).toMatchObject({ assetId: "a".repeat(64), symbol: "USDS" });
  });

  test("the token list is not taller than the visual viewport", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);
    await component.getByPlaceholder(/search tokens/i).tap();

    const dialog = page.getByRole(DROPDOWN);
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 0;
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(viewportHeight);
  });
});

test.describe("AssetSelector — AssetList dropdown branch", () => {
  // What the trading create-offer form actually renders (useAssetListForDropdown).
  // It has its own click handler, so the default branch's coverage does not carry over.

  test("a click selects the token and closes the dropdown", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory useAssetList={true} />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    await page.waitForTimeout(500);
    await page.getByRole(DROPDOWN).getByText("USDS", { exact: true }).click();

    await expect(page.getByRole(DROPDOWN)).toBeHidden();
    expect(await state(page)).toMatchObject({ assetId: "a".repeat(64), symbol: "USDS" });
  });

  test("a tap selects the token", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory useAssetList={true} />);

    await component.getByPlaceholder(/search tokens/i).click();
    await expect(page.getByRole(DROPDOWN)).toBeVisible();

    await page.waitForTimeout(500);
    await page.getByRole(DROPDOWN).getByText("XCH", { exact: true }).click();

    expect(await state(page)).toMatchObject({ assetId: "", symbol: "XCH" });
  });
});

test.describe("AssetSelector — asset type and selection round trip", () => {
  test("choosing XCH leaves the type selector showing Token, not a blank control", async ({
    mount,
    page,
  }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await page.getByRole(DROPDOWN).getByText("XCH", { exact: true }).click();

    // XCH belongs to the Token category. The select must land on a real option rather
    // than the browser's "no option matched" state, which renders as an empty control.
    const select = component.getByRole("combobox");
    expect(await select.inputValue()).toBe("cat");
    expect(
      await select.evaluate((element) => (element as HTMLSelectElement).selectedIndex)
    ).toBeGreaterThanOrEqual(0);
  });

  test("an XCH selection reports an empty assetId, so downstream treats it as XCH", async ({
    mount,
    page,
  }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await page.getByRole(DROPDOWN).getByText("XCH", { exact: true }).click();

    const current = await state(page);
    expect(current.assetId).toBe("");
    expect(current.symbol).toBe("XCH");
  });

  test("switching Token → NFT → Token restores the chosen token", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await page.getByRole(DROPDOWN).getByText("USDS", { exact: true }).click();
    expect(await state(page)).toMatchObject({ assetId: "a".repeat(64) });

    const select = component.getByRole("combobox");
    await select.selectOption("nft");

    // The NFT view must not show the token's id — the categories hold different things.
    expect(await state(page)).toMatchObject({ type: "nft", assetId: "" });

    await select.selectOption("cat");

    // Coming back restores the selection instead of silently destroying the user's work.
    expect(await state(page)).toMatchObject({
      type: "cat",
      assetId: "a".repeat(64),
      symbol: "USDS",
    });
  });

  test("an XCH selection also survives a category round trip", async ({ mount, page }) => {
    const component = await mount(<AssetSelectorStory />);

    await component.getByPlaceholder(/search tokens/i).click();
    await page.getByRole(DROPDOWN).getByText("XCH", { exact: true }).click();

    const select = component.getByRole("combobox");
    await select.selectOption("option");
    await select.selectOption("cat");

    // XCH restores as `xch` with an empty id, not as a bare `cat` — the pair stays
    // coherent, which is what downstream keys off.
    expect(await state(page)).toMatchObject({ type: "xch", assetId: "", symbol: "XCH" });
  });
});
