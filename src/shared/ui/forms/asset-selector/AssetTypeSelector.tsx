"use client";

import { useThemeClasses } from "@/shared/hooks";
import type { AssetType } from "@/entities/offer";
import type { AssetCategory } from "./assetCategory";

interface AssetTypeSelectorProps {
  /**
   * The selected *category*. XCH and CAT share the "Token" option, so callers pass
   * `assetCategoryOf(asset.type)` rather than the raw type — otherwise the control ends
   * up holding a value none of its options provide.
   */
  value: AssetCategory;
  onChange: (category: AssetCategory) => void;
  enabledAssetTypes: AssetType[];
}

export default function AssetTypeSelector({
  value,
  onChange,
  enabledAssetTypes,
}: AssetTypeSelectorProps) {
  const { t } = useThemeClasses();

  return (
    <div className="flex-shrink-0 w-16 sm:w-21">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AssetCategory)}
        className={`w-full px-0.5 sm:px-1 py-1.5 sm:py-2 text-[11px] sm:text-xs rounded-lg border ${t.border} ${t.bg} ${t.text} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
      >
        {enabledAssetTypes.includes("cat") && <option value="cat">Token</option>}
        {enabledAssetTypes.includes("nft") && <option value="nft">NFT</option>}
        {enabledAssetTypes.includes("option") && <option value="option">Option</option>}
      </select>
    </div>
  );
}
