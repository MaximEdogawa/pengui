"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useCatTokens, TickerIcon, XchIcon } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrderBookFilters } from "@/features/trading/hooks/useOrderBookFilters";
import { SuggestionItem } from "@/features/trading/lib/orderBookTypes";
import AssetSwapToggle from "./AssetSwapToggle";
import FilterButton from "./FilterButton";
import OrderBookPaginationControls from "./OrderBookPaginationControls";

interface OrderBookFiltersProps {
  onFiltersChange?: () => void;
}

export default function OrderBookFilters({
  onFiltersChange,
}: OrderBookFiltersProps) {
  const { t } = useThemeClasses();
  const {
    filters,
    searchValue,
    filteredSuggestions,
    setSearchValue,
    setFilteredSuggestions,
    addFilter,
    removeFilter,
    pagination,
    setPagination,
  } = useOrderBookFilters();

  const { availableCatTokens } = useCatTokens();
  const { network } = useNetwork();
  const isTestnet = network === "testnet";
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Create a map of ticker -> assetId for quick lookups
  const tickerToAssetId = useMemo(() => {
    const map = new Map<string, string>();
    availableCatTokens.forEach((token) => {
      map.set(token.ticker.toLowerCase(), token.assetId);
    });
    return map;
  }, [availableCatTokens]);

  // Helper to check if ticker is XCH/TXCH
  const isXchTicker = (ticker: string) => {
    const lower = ticker.toLowerCase();
    return lower === "xch" || lower === "txch";
  };

  // Generate suggestions based on search value
  useEffect(() => {
    if (!searchValue?.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerSearch = searchValue.toLowerCase();
    const suggestions: SuggestionItem[] = [];
    const nativeTicker = getNativeTokenTickerForNetwork(network).toLowerCase();
    const normalizedSearch =
      lowerSearch === "xch" || lowerSearch === "txch"
        ? nativeTicker
        : lowerSearch;
    const addedTickers = new Set<string>();

    availableCatTokens.forEach((token) => {
      const tokenTicker = token.ticker.toLowerCase();
      if (
        addedTickers.has(tokenTicker) ||
        (!tokenTicker.includes(normalizedSearch) &&
          !token.name.toLowerCase().includes(normalizedSearch))
      ) {
        return;
      }
      addedTickers.add(tokenTicker);
      const tickerLower = token.ticker.toLowerCase();
      if (!filters.buyAsset?.some((f) => f.toLowerCase() === tickerLower)) {
        suggestions.push({
          value: token.ticker,
          column: "buyAsset",
          label: token.ticker,
        });
      }
      if (!filters.sellAsset?.some((f) => f.toLowerCase() === tickerLower)) {
        suggestions.push({
          value: token.ticker,
          column: "sellAsset",
          label: token.ticker,
        });
      }
    });

    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  }, [
    searchValue,
    availableCatTokens,
    filters,
    setFilteredSuggestions,
    network,
  ]);

  const triggerCallback = useCallback(
    () => setTimeout(() => onFiltersChange?.(), 0),
    [onFiltersChange],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: SuggestionItem) => {
      addFilter(
        suggestion.column as "buyAsset" | "sellAsset" | "status",
        suggestion.value,
      );
      setSearchValue("");
      setShowSuggestions(false);
      triggerCallback();
    },
    [addFilter, setSearchValue, triggerCallback],
  );

  const handleRemoveFilter = useCallback(
    (column: "buyAsset" | "sellAsset" | "status", value: string) => {
      removeFilter(column, value);
      triggerCallback();
    },
    [removeFilter, triggerCallback],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        suggestionsRef.current?.contains(target) ||
        searchInputRef.current?.contains(target)
      ) {
        return;
      }
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Input with Filter, Swap Toggle, and Pagination */}
      <div className="relative flex items-center gap-1.5">
        {/* Filter Button - on the left side */}
        <FilterButton />

        {/* Asset Swap Toggle */}
        <AssetSwapToggle />

        {/* Search Input */}
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() =>
              filteredSuggestions.length > 0 && setShowSuggestions(true)
            }
            placeholder={`Search assets (e.g., ${getNativeTokenTickerForNetwork(network)}, TBYC)...`}
            className={`w-full px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-lg border-2 ${t.border} ${t.bg} ${t.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm`}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className={`absolute z-[100] w-full mt-1 backdrop-blur-[40px] ${t.card} border-2 ${t.border} rounded-lg shadow-2xl max-h-60 overflow-y-auto`}
              style={{
                boxShadow:
                  "0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              }}
            >
              {filteredSuggestions.map((suggestion, index) => {
                const assetId = tickerToAssetId.get(
                  suggestion.value.toLowerCase(),
                );
                const isXch = isXchTicker(suggestion.value);
                return (
                  <button
                    key={`${suggestion.column}-${suggestion.value}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-3 py-2 text-sm ${t.cardHover} ${t.text} transition-colors border-b ${t.border} last:border-b-0`}
                  >
                    <div className="flex items-center gap-2">
                      {isXch ? (
                        <XchIcon size={20} isTestnet={isTestnet} />
                      ) : assetId ? (
                        <TickerIcon
                          assetId={assetId}
                          ticker={suggestion.label}
                          size={20}
                        />
                      ) : null}
                      <div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className={`text-xs ${t.textSecondary}`}>
                          {suggestion.column === "buyAsset"
                            ? "Buy Asset"
                            : "Sell Asset"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls - on the right side of the search bar */}
        {pagination !== undefined && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Orders:
            </span>
            <OrderBookPaginationControls
              value={pagination}
              onChange={setPagination}
            />
          </div>
        )}
      </div>

      {/* Filter Chips with Icons */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {filters.buyAsset?.map((asset) => {
          const assetId = tickerToAssetId.get(asset.toLowerCase());
          const isXch = isXchTicker(asset);
          return (
            <div
              key={`buy-${asset}`}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${t.card} border ${t.border} text-[10px] sm:text-xs`}
            >
              {isXch ? (
                <XchIcon size={14} isTestnet={isTestnet} />
              ) : assetId ? (
                <TickerIcon assetId={assetId} ticker={asset} size={14} />
              ) : null}
              <span className={t.text}>Buy: {asset}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("buyAsset", asset)}
                className={`${t.textSecondary} hover:${t.text} transition-colors`}
              >
                <X size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          );
        })}
        {filters.sellAsset?.map((asset) => {
          const assetId = tickerToAssetId.get(asset.toLowerCase());
          const isXch = isXchTicker(asset);
          return (
            <div
              key={`sell-${asset}`}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${t.card} border ${t.border} text-[10px] sm:text-xs`}
            >
              {isXch ? (
                <XchIcon size={14} isTestnet={isTestnet} />
              ) : assetId ? (
                <TickerIcon assetId={assetId} ticker={asset} size={14} />
              ) : null}
              <span className={t.text}>Sell: {asset}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("sellAsset", asset)}
                className={`${t.textSecondary} hover:${t.text} transition-colors`}
              >
                <X size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
