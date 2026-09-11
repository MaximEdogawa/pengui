import type { AssetType } from "@/entities/offer";

/**
 * The categories the asset type `<select>` offers.
 *
 * This is deliberately narrower than {@link AssetType}: the selector asks "what kind of
 * thing are you offering?", and XCH and CAT tokens are the same answer — "Token" — from
 * the user's point of view. They are searched through one unified token list, and the
 * concrete type is settled by which entry is picked, not by the dropdown.
 */
export type AssetCategory = "cat" | "nft" | "option";

/**
 * The category a concrete asset type belongs to.
 *
 * `xch` and `cat` collapse to the `cat` ("Token") category. Feeding the `<select>` this
 * instead of the raw type is what stops it holding a value it renders no option for:
 * with `value="xch"` the browser silently falls back to the first option, so React's
 * idea of the control and the DOM's disagree. That desync has no visible symptom today
 * only because the first option happens to be `cat` — reorder the options, or add an
 * explicit XCH entry, and it becomes a real bug.
 */
export function assetCategoryOf(type: AssetType): AssetCategory {
  return type === "xch" ? "cat" : type;
}

/**
 * The asset type to store when the user picks a category.
 *
 * Choosing "Token" starts an unresolved token search, which is represented as `cat`
 * until a concrete token is selected — at which point an empty asset id means XCH.
 */
export function assetTypeForCategory(category: AssetCategory): AssetType {
  return category;
}

/**
 * Whether an asset's `type` and `assetId` contradict each other.
 *
 * XCH is the token with no asset id, so `xch` with an asset id, or `cat` with none once
 * a selection has been made, means something upstream lost track of the pair. Exported
 * for tests and for callers that want to assert the invariant.
 */
export function isCoherentAsset(type: AssetType, assetId: string): boolean {
  if (type === "xch") return assetId === "";
  return true;
}
