"use client";

import type { AssetType, BaseAsset } from "@/entities/offer";
import { useThemeClasses } from "@/shared/hooks";
import { assetInputAmounts, formatAssetAmountForInput } from "@/shared/lib/utils/chia-units";
import { useCallback, useState } from "react";
import { assetCategoryOf, assetTypeForCategory, type AssetCategory } from "./assetCategory";
import AmountInput from "./AmountInput";
import AssetIdInput from "./AssetIdInput";
import AssetTypeSelector from "./AssetTypeSelector";
import RemoveAssetButton from "./RemoveAssetButton";
import TokenSearchInput from "./TokenSearchInput";

export interface ExtendedAsset extends BaseAsset {
  searchQuery?: string;
  showDropdown?: boolean;
  _amountInput?: string; // Temporary string for input while typing
}

/** A selection set aside while the user looks at another category. */
interface ParkedAsset {
  assetId: string;
  symbol: string;
  searchQuery: string;
  type: AssetType;
}

export interface TokenInfo {
  assetId: string;
  ticker: string;
  symbol?: string;
  name?: string;
  /** Optional icon URL for the token */
  iconUrl?: string | null;
  /** Whether the icon is currently loading */
  iconLoading?: boolean;
}

export interface AssetSelectorProps {
  asset: ExtendedAsset;
  onUpdate: (asset: ExtendedAsset) => void;
  onRemove?: () => void;
  placeholder?: string;
  showRemoveButton?: boolean;
  enabledAssetTypes?: AssetType[]; // Optional filter for which asset types to show
  className?: string;
  // Token data props (to avoid FSD violation - shared cannot import from entities)
  availableTokens?: TokenInfo[];
  isLoadingTickers?: boolean;
  useAssetListForDropdown?: boolean;
}

/**
 * Generic Asset Selector Component
 * Supports XCH, CAT tokens, NFTs, and Options
 * Can be used throughout the app for asset selection
 */
export default function AssetSelector({
  asset,
  onUpdate,
  onRemove,
  placeholder = "Select asset",
  showRemoveButton = true,
  enabledAssetTypes = ["xch", "cat", "nft", "option"],
  className = "",
  availableTokens: providedTokens = [],
  isLoadingTickers = false,
  useAssetListForDropdown = false,
}: AssetSelectorProps) {
  const { t } = useThemeClasses();
  const [showDropdown, setShowDropdown] = useState(false);

  // Use provided tokens or empty array
  const availableTokens = providedTokens;

  // Filter available asset types based on enabledAssetTypes prop
  const availableAssetTypes = enabledAssetTypes.filter(
    (type) => type === "xch" || type === "cat" || type === "nft" || type === "option"
  );

  const filteredTokens = useCallback(
    (searchQuery: string) => {
      if (!searchQuery) return availableTokens;
      const query = searchQuery.toLowerCase();
      return availableTokens.filter(
        (token) =>
          token.ticker.toLowerCase().includes(query) ||
          (token.name && token.name.toLowerCase().includes(query)) ||
          (token.assetId && token.assetId.toLowerCase().includes(query)) // Also search by asset ID
      );
    },
    [availableTokens]
  );

  const selectToken = useCallback(
    (token: { assetId: string; ticker: string; symbol?: string; name?: string }) => {
      // Determine asset type: XCH if assetId is empty, otherwise CAT
      const assetType: AssetType = token.assetId === "" ? "xch" : "cat";
      onUpdate({
        ...asset,
        assetId: token.assetId,
        type: assetType,
        symbol: token.symbol || token.ticker,
        name: token.name,
        searchQuery: token.ticker,
        showDropdown: false,
      });
      setShowDropdown(false);
    },
    [asset, onUpdate]
  );

  /**
   * What the user had chosen in each category, so switching away and back does not
   * destroy their work.
   *
   * An NFT id is meaningless under "Token", so the *visible* asset still has to change
   * when the category does. Parking the old selection here instead of discarding it is
   * what makes the change non-destructive: pick a token, glance at NFT, come back, and
   * the token is still there. Ephemeral UI state, deliberately not lifted to the parent
   * — the parent owns the asset that is currently selected, not the ones that are not.
   */
  const [parkedByCategory, setParkedByCategory] = useState<
    Partial<Record<AssetCategory, ParkedAsset>>
  >({});

  /**
   * The user picked a different *category* (Token / NFT / Option).
   *
   * Switching between XCH and a CAT is not a category change — that happens inside the
   * token dropdown and never reaches here.
   */
  const handleCategoryChange = useCallback(
    (category: AssetCategory) => {
      const currentCategory = assetCategoryOf(asset.type);
      if (category === currentCategory) return;

      setParkedByCategory((parked) => ({
        ...parked,
        [currentCategory]: {
          assetId: asset.assetId,
          symbol: asset.symbol ?? "",
          searchQuery: asset.searchQuery ?? "",
          type: asset.type,
        },
      }));

      const restored = parkedByCategory[category];

      // One onUpdate call, so no intermediate render can reintroduce stale data.
      onUpdate({
        ...asset,
        assetId: restored?.assetId ?? "",
        symbol: restored?.symbol ?? "",
        searchQuery: restored?.searchQuery ?? "",
        showDropdown: false,
        // A restored Token selection may have been XCH, which is not `cat`.
        type: restored?.type ?? assetTypeForCategory(category),
        amount: category === "nft" || category === "option" ? 1 : asset.amount,
      });
    },
    [asset, onUpdate, parkedByCategory]
  );

  const handleSearchFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  /**
   * Closing is owned entirely by the dropdown.
   *
   * There is deliberately no `onBlur` handler. `TokenDropdown` is a modal Radix
   * `Dialog`: opening it moves focus into the dialog, which blurs this input. The old
   * code responded to that blur by closing the dropdown 200 ms later — so the dropdown
   * dismissed itself moments after opening, and selecting anything meant winning a race
   * against that timer. The Dialog already handles outside-click, Escape and selection,
   * so blur must not participate in dismissal at all.
   */
  const handleDropdownClose = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const getAssetTypePlaceholder = (type: AssetType): string =>
    type === "cat"
      ? isLoadingTickers
        ? "Loading tokens..."
        : "Search tokens (XCH, CAT tokens)..."
      : type === "nft"
        ? "NFT Asset ID"
        : type === "option"
          ? "Option Contract ID"
          : placeholder;

  // Check if amount input should be hidden (NFT and Option always have amount = 1)
  const hideAmountInput = asset.type === "nft" || asset.type === "option";

  return (
    <div
      className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg border ${t.border} ${t.card} ${className}`}
    >
      {/* Asset Type Selector — fed the category, not the raw type, so a selected XCH
          still shows "Token" instead of leaving the control with an unmatched value. */}
      <AssetTypeSelector
        value={assetCategoryOf(asset.type)}
        onChange={handleCategoryChange}
        enabledAssetTypes={availableAssetTypes}
      />

      {/* Asset Selection */}
      <div
        className={`relative h-8 sm:h-10 md:h-8 flex items-center min-w-0 ${hideAmountInput ? "flex-[1]" : "flex-[0.7]"}`}
      >
        {asset.type === "cat" || asset.type === "xch" ? (
          <TokenSearchInput
            value={asset.searchQuery || ""}
            onChange={(value) =>
              onUpdate({
                ...asset,
                searchQuery: value,
              })
            }
            onFocus={handleSearchFocus}
            placeholder={isLoadingTickers ? "Loading..." : "Search tokens..."}
            disabled={isLoadingTickers}
            filteredTokens={filteredTokens(asset.searchQuery || "")}
            onSelectToken={selectToken}
            isDropdownOpen={showDropdown}
            onCloseDropdown={handleDropdownClose}
            allTokens={availableTokens}
            useAssetList={useAssetListForDropdown}
          />
        ) : (
          <AssetIdInput
            value={asset.assetId}
            onChange={(value) => {
              const updatedAsset = {
                ...asset,
                assetId: value,
                // Ensure amount is 1 for NFT and Option
                amount: asset.type === "nft" || asset.type === "option" ? 1 : asset.amount,
              };
              onUpdate(updatedAsset);
            }}
            placeholder={getAssetTypePlaceholder(asset.type)}
          />
        )}
      </div>

      {/* Amount Input - Hidden for NFT and Option */}
      {!hideAmountInput && (
        <div className="flex-[1] sm:flex-[1.3] h-8">
          <AmountInput
            value={asset.amount}
            tempInput={asset._amountInput}
            type={asset.type}
            onChange={(amount, tempInput) => {
              onUpdate({
                ...asset,
                _amountInput: tempInput,
                amount,
              });
            }}
            onBlur={() => {
              const inputValue = asset._amountInput || "";
              // Safely convert to number
              const finalAmount = assetInputAmounts.parse(inputValue, asset.type);
              // Preserve the input format if user typed something like "1.0" or "1.00"
              // Only clear tempInput if the formatted value matches the input (no loss of precision)
              const formatted = formatAssetAmountForInput(finalAmount, asset.type);
              const shouldPreserveInput = inputValue.includes(".") && inputValue !== formatted;

              onUpdate({
                ...asset,
                amount: finalAmount,
                // Keep tempInput if user typed a decimal format that would be lost
                _amountInput: shouldPreserveInput ? inputValue : undefined,
              });
            }}
          />
        </div>
      )}

      {/* Remove Button */}
      {showRemoveButton && onRemove && <RemoveAssetButton onRemove={onRemove} />}
    </div>
  );
}
