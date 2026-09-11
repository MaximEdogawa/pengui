import { describe, expect, it } from "bun:test";
import type { AssetType } from "@/entities/offer";
import { assetCategoryOf, assetTypeForCategory, isCoherentAsset } from "./assetCategory";

/**
 * The type/category split exists because the asset `<select>` offers Token / NFT / Option
 * while {@link AssetType} also has `xch`. Feeding the raw type to the control let it hold
 * a value none of its options provide, at which point React's idea of the control and the
 * DOM's disagree. These lock the mapping so that cannot come back.
 */
describe("assetCategoryOf", () => {
  it("puts XCH in the Token category, because the selector has no XCH option", () => {
    expect(assetCategoryOf("xch")).toBe("cat");
  });

  it("leaves the categories that are their own type alone", () => {
    expect(assetCategoryOf("cat")).toBe("cat");
    expect(assetCategoryOf("nft")).toBe("nft");
    expect(assetCategoryOf("option")).toBe("option");
  });

  it("only ever returns a value the selector renders an option for", () => {
    const rendered = ["cat", "nft", "option"];
    const everyType: AssetType[] = ["xch", "cat", "nft", "option"];
    for (const type of everyType) {
      expect(rendered).toContain(assetCategoryOf(type));
    }
  });
});

describe("assetTypeForCategory", () => {
  it("starts a Token selection as an unresolved CAT search", () => {
    // XCH is only known once a token with an empty asset id is picked from the dropdown.
    expect(assetTypeForCategory("cat")).toBe("cat");
  });

  it("maps the concrete categories straight through", () => {
    expect(assetTypeForCategory("nft")).toBe("nft");
    expect(assetTypeForCategory("option")).toBe("option");
  });

  it("round-trips through assetCategoryOf", () => {
    for (const category of ["cat", "nft", "option"] as const) {
      expect(assetCategoryOf(assetTypeForCategory(category))).toBe(category);
    }
  });
});

describe("isCoherentAsset", () => {
  it("accepts XCH only without an asset id", () => {
    expect(isCoherentAsset("xch", "")).toBe(true);
    expect(isCoherentAsset("xch", "a".repeat(64))).toBe(false);
  });

  it("accepts a CAT with or without an id, since an id arrives after the search", () => {
    expect(isCoherentAsset("cat", "")).toBe(true);
    expect(isCoherentAsset("cat", "a".repeat(64))).toBe(true);
  });

  it("holds for the pair the dropdown produces when XCH is chosen", () => {
    // selectToken derives the type from the asset id, so this is the pair the component
    // reports upward for XCH; downstream keys off the empty id, not the type.
    expect(isCoherentAsset("xch", "")).toBe(true);
  });
});
