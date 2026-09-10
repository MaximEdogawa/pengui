"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useCatTokens, TickerIcon, XchIcon } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrderBookFilters } from "@/features/trading/hooks/OrderBookFiltersProvider";
import AssetSwapToggle from "./AssetSwapToggle";
import FilterButton from "./FilterButton";
import OrderBookPaginationControls from "./OrderBookPaginationControls";

interface OrderBookFiltersProps {
  onFiltersChange?: () => void;
  /** When true, hide the "Orders" pagination control (amount of orders shown in the book) */
  hidePagination?: boolean;
}

export default function OrderBookFilters({
  onFiltersChange,
  hidePagination = false,
}: OrderBookFiltersProps) {
  const { t } = useThemeClasses();
  const {
    filters,
    searchValue,
    filteredSuggestions,
    setSearchValue,
    applySuggestion,
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

  const renderAssetIcon = useCallback(
    (ticker: string, size: number) => {
      const assetId = tickerToAssetId.get(ticker.toLowerCase());
      if (isXchTicker(ticker)) {
        return <XchIcon size={size} isTestnet={isTestnet} />;
      }
      if (assetId) {
        return <TickerIcon assetId={assetId} ticker={ticker} size={size} />;
      }
      return null;
    },
    [isTestnet, tickerToAssetId]
  );

  useEffect(() => {
    if (filteredSuggestions.length === 0) {
      setShowSuggestions(false);
      return;
    }

    if (searchValue.trim()) {
      setShowSuggestions(true);
    }
  }, [filteredSuggestions, searchValue]);

  const triggerCallback = useCallback(
    () => setTimeout(() => onFiltersChange?.(), 0),
    [onFiltersChange]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: (typeof filteredSuggestions)[number]) => {
      applySuggestion(suggestion);
      setShowSuggestions(false);
      triggerCallback();
    },
    [applySuggestion, triggerCallback]
  );

  const handleRemoveFilter = useCallback(
    (column: "buyAsset" | "sellAsset" | "status", value: string) => {
      removeFilter(column, value);
      triggerCallback();
    },
    [removeFilter, triggerCallback]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (suggestionsRef.current?.contains(target) || searchInputRef.current?.contains(target)) {
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
            onFocus={() => {
              if (filteredSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={`Search assets (e.g., ${getNativeTokenTickerForNetwork(network)})...`}
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
                return (
                  <button
                    key={`${suggestion.column}-${suggestion.value}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-3 py-2 text-sm ${t.cardHover} ${t.text} transition-colors border-b ${t.border} last:border-b-0`}
                  >
                    <div className="flex items-center gap-2">
                      {suggestion.type === "pair" &&
                      suggestion.pairBuyAsset &&
                      suggestion.pairSellAsset ? (
                        <div className="flex items-center">
                          <div className="relative flex h-6 w-9 items-center">
                            <div className="absolute left-0 top-0 z-10 rounded-full ring-2 ring-white dark:ring-gray-900">
                              {renderAssetIcon(suggestion.pairBuyAsset, 20)}
                            </div>
                            <div className="absolute right-0 top-0 rounded-full ring-2 ring-white dark:ring-gray-900">
                              {renderAssetIcon(suggestion.pairSellAsset, 20)}
                            </div>
                          </div>
                        </div>
                      ) : suggestion.value ? (
                        renderAssetIcon(suggestion.value, 20)
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{suggestion.label}</div>
                          {suggestion.type === "single" && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide border ${t.border} ${t.textSecondary}`}
                            >
                              {suggestion.column === "buyAsset" ? "Buy" : "Sell"}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${t.textSecondary}`}>
                          {suggestion.type === "pair"
                            ? suggestion.sublabel
                            : suggestion.sublabel
                              ? `${suggestion.column === "buyAsset" ? "Buy" : "Sell"} asset · ${suggestion.sublabel}`
                              : suggestion.column === "buyAsset"
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

        {/* Pagination Controls - how many orders to show in the order book */}
        {!hidePagination && pagination !== undefined && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Orders:
            </span>
            <OrderBookPaginationControls value={pagination} onChange={setPagination} />
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
