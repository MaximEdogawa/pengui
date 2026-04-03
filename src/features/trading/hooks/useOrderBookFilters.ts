"use client";

import { useCatTokens } from "@/entities/asset";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AssetPair, OrderBookPagination, SuggestionItem } from "../lib/orderBookTypes";
import { parseSearchInput } from "../lib/parseSearchInput";
import {
  useOrderBookFilterStore,
  useHasActiveFilters,
  useHasHydrated,
} from "./orderBookFilterStore";
import { usePriceDataPrefetch } from "./usePriceDataPrefetch";
import { useTopVolumePairs } from "./useTopVolumePairs";

const DEFAULT_PAGINATION: OrderBookPagination = 50;

export function useOrderBookFilters() {
  const queryClient = useQueryClient();
  const { network } = useNetwork();
  const { availableCatTokens } = useCatTokens();
  const topVolumePairs = useTopVolumePairs(3);
  const prevNetworkRef = useRef<typeof network | null>(null);

  // Get state from Zustand store (reactive)
  const filters = useOrderBookFilterStore((state) => state.filters);
  const searchValue = useOrderBookFilterStore((state) => state.searchValue);
  const filteredSuggestions = useOrderBookFilterStore((state) => state.filteredSuggestions);
  const assetsSwapped = useOrderBookFilterStore((state) => state.assetsSwapped);
  const showFilterPane = useOrderBookFilterStore((state) => state.showFilterPane);
  const savedNetwork = useOrderBookFilterStore((state) => state.savedNetwork);
  const hasActiveFilters = useHasActiveFilters();
  const hasHydrated = useHasHydrated();
  const userClearedFilters = useOrderBookFilterStore((state) => state.userClearedFilters);
  const recentPairs = useOrderBookFilterStore((state) =>
    Array.isArray(state.recentPairs) ? state.recentPairs : []
  );

  // Get action functions directly from store (these are stable references)
  const storeSetSearchValue = useOrderBookFilterStore((state) => state.setSearchValue);
  const storeSetFilteredSuggestions = useOrderBookFilterStore(
    (state) => state.setFilteredSuggestions
  );
  const storeAddFilter = useOrderBookFilterStore((state) => state.addFilter);
  const storeRemoveFilter = useOrderBookFilterStore((state) => state.removeFilter);
  const storeClearAllFilters = useOrderBookFilterStore((state) => state.clearAllFilters);
  const storeSwapBuySellAssets = useOrderBookFilterStore((state) => state.swapBuySellAssets);
  const storeToggleFilterPane = useOrderBookFilterStore((state) => state.toggleFilterPane);
  const storeSetShowFilterPane = useOrderBookFilterStore((state) => state.setShowFilterPane);
  const storeSetPagination = useOrderBookFilterStore((state) => state.setPagination);

  const storeAddRecentPair = useOrderBookFilterStore((state) => state.addRecentPair);

  // Get actions directly from store for network change handling
  const storeClearFiltersForNetwork = useOrderBookFilterStore((state) => state.clearAllFilters);
  const setSavedNetwork = useOrderBookFilterStore((state) => state.setSavedNetwork);
  const storeSetBuyAsset = useOrderBookFilterStore((state) => state.setBuyAsset);
  const storeSetSellAsset = useOrderBookFilterStore((state) => state.setSellAsset);

  const effectiveRecentPairs = useMemo(() => {
    const sourcePairs = recentPairs.length > 0 ? recentPairs : topVolumePairs;

    return sourcePairs.filter(
      (pair, index, pairs) =>
        pair.buyAsset.toLowerCase() !== pair.sellAsset.toLowerCase() &&
        pairs.findIndex(
          (candidate) =>
            candidate.buyAsset.toLowerCase() === pair.buyAsset.toLowerCase() &&
            candidate.sellAsset.toLowerCase() === pair.sellAsset.toLowerCase()
        ) === index
    );
  }, [recentPairs, topVolumePairs]);

  // Handle network changes - clear ALL filters when network changes
  // Wait for hydration to complete before making network-based decisions
  useEffect(() => {
    // Don't run until store has been hydrated from localStorage
    if (!hasHydrated) return;

    const applyDefaultPairForNetwork = (net: typeof network) => {
      if (net === "mainnet") {
        // Default mainnet pair: XCH/BYC
        storeSetBuyAsset(["XCH"]);
        storeSetSellAsset(["BYC"]);
      } else {
        // Default testnet pair: TXCH/TBYC
        storeSetBuyAsset(["TXCH"]);
        storeSetSellAsset(["TBYC"]);
      }
    };

    if (prevNetworkRef.current === null) {
      // Initial mount (after hydration)
      if (savedNetwork !== null && savedNetwork !== network) {
        // Stored network does not match current -> reset and apply defaults for current network
        storeClearFiltersForNetwork();
        setSavedNetwork(network);
        applyDefaultPairForNetwork(network);
      } else {
        // Either no saved network or it matches current.
        // If there are no active filters and the user hasn't explicitly cleared them,
        // apply network-specific defaults and persist them.
        if (!hasActiveFilters && !userClearedFilters) {
          applyDefaultPairForNetwork(network);
        }
        if (savedNetwork === null) {
          setSavedNetwork(network);
        }
      }
      prevNetworkRef.current = network;
    } else if (prevNetworkRef.current !== network) {
      // Network changed - clear all filters and update network
      storeClearFiltersForNetwork();
      setSavedNetwork(network);
      applyDefaultPairForNetwork(network);
      prevNetworkRef.current = network;
    }
  }, [
    network,
    savedNetwork,
    hasHydrated,
    hasActiveFilters,
    userClearedFilters,
    storeClearFiltersForNetwork,
    setSavedNetwork,
    storeSetBuyAsset,
    storeSetSellAsset,
  ]);

  // Invalidate queries when filters or pagination change
  const buyAssetKey = JSON.stringify(filters.buyAsset || []);
  const sellAssetKey = JSON.stringify(filters.sellAsset || []);
  const statusKey = JSON.stringify(filters.status || []);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Skip until hydrated and network effect has run
    if (!hasHydrated || prevNetworkRef.current === null) {
      return;
    }

    // Skip the first run after initialization to avoid unnecessary invalidation
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    // Use a small delay to ensure state has fully updated
    const timeoutId = setTimeout(() => {
      // Only invalidate - TanStack Query will automatically refetch active queries
      queryClient.invalidateQueries({ queryKey: ["orderBook"] });
      // Also invalidate price data queries when filters change
      queryClient.invalidateQueries({ queryKey: ["priceData"] });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [buyAssetKey, sellAssetKey, statusKey, filters.pagination, queryClient, hasHydrated]);

  // Return filters as a new object reference when filters change to ensure reactivity
  const memoizedFilters = useMemo(
    () => ({
      buyAsset: filters.buyAsset ? [...filters.buyAsset] : [],
      sellAsset: filters.sellAsset ? [...filters.sellAsset] : [],
      status: filters.status ? [...filters.status] : [],
      pagination: filters.pagination || DEFAULT_PAGINATION,
    }),
    [filters.buyAsset, filters.sellAsset, filters.status, filters.pagination]
  );

  // Prefetch price data when filters change
  usePriceDataPrefetch(memoizedFilters);

  useEffect(() => {
    const nativeTicker = getNativeTokenTickerForNetwork(network);
    const normalizedNativeTicker = nativeTicker.toLowerCase();

    const normalizeTicker = (ticker: string) => {
      const lower = ticker.toLowerCase();
      if (lower === "xch" || lower === "txch") {
        return nativeTicker;
      }
      return ticker.toUpperCase();
    };

    const pairSuggestions: SuggestionItem[] = effectiveRecentPairs.map((pair, index) => ({
      value: `${pair.buyAsset}/${pair.sellAsset}`,
      column: "buyAsset",
      label: `${pair.buyAsset}/${pair.sellAsset}`,
      type: "pair",
      pairBuyAsset: pair.buyAsset,
      pairSellAsset: pair.sellAsset,
      sublabel:
        recentPairs.length > 0 && index < recentPairs.length ? "Recent pair" : "Top volume pair",
    }));

    const trimmedSearch = searchValue.trim();
    if (!trimmedSearch) {
      storeSetFilteredSuggestions(pairSuggestions);
      return;
    }

    const parsed = parseSearchInput(trimmedSearch);
    const addedKeys = new Set<string>();
    const suggestions: SuggestionItem[] = [];

    const hasBuyAsset = (ticker: string) =>
      filters.buyAsset?.some((value) => value.toLowerCase() === ticker.toLowerCase()) ?? false;
    const hasSellAsset = (ticker: string) =>
      filters.sellAsset?.some((value) => value.toLowerCase() === ticker.toLowerCase()) ?? false;
    const existsOnOppositeSide = (ticker: string, column: "buyAsset" | "sellAsset") =>
      column === "buyAsset" ? hasSellAsset(ticker) : hasBuyAsset(ticker);

    const addSingleSuggestion = (
      ticker: string,
      column: "buyAsset" | "sellAsset",
      name?: string
    ) => {
      const normalizedTicker = normalizeTicker(ticker);
      const key = `${column}:${normalizedTicker}`;
      if (addedKeys.has(key)) {
        return;
      }
      if (column === "buyAsset" ? hasBuyAsset(normalizedTicker) : hasSellAsset(normalizedTicker)) {
        return;
      }
      if (existsOnOppositeSide(normalizedTicker, column)) {
        return;
      }

      addedKeys.add(key);
      suggestions.push({
        value: normalizedTicker,
        column,
        label: normalizedTicker,
        type: "single",
        sublabel: name,
      });
    };

    const addPairSuggestion = (buyAsset: string, sellAsset: string, sublabel = "Pair match") => {
      const normalizedBuyAsset = normalizeTicker(buyAsset);
      const normalizedSellAsset = normalizeTicker(sellAsset);
      if (normalizedBuyAsset.toLowerCase() === normalizedSellAsset.toLowerCase()) {
        return;
      }
      const key = `pair:${normalizedBuyAsset}/${normalizedSellAsset}`;
      if (addedKeys.has(key)) {
        return;
      }
      if (
        filters.buyAsset?.[0]?.toLowerCase() === normalizedBuyAsset.toLowerCase() &&
        filters.sellAsset?.[0]?.toLowerCase() === normalizedSellAsset.toLowerCase()
      ) {
        return;
      }

      addedKeys.add(key);
      suggestions.push({
        value: `${normalizedBuyAsset}/${normalizedSellAsset}`,
        column: "buyAsset",
        label: `${normalizedBuyAsset}/${normalizedSellAsset}`,
        type: "pair",
        pairBuyAsset: normalizedBuyAsset,
        pairSellAsset: normalizedSellAsset,
        sublabel,
      });
    };

    if (parsed.mode === "pair" && parsed.tokens.length === 2) {
      addPairSuggestion(parsed.tokens[0].ticker, parsed.tokens[1].ticker, "Search pair");
    }

    const tokenQueries = parsed.tokens.map((token) => normalizeTicker(token.ticker).toLowerCase());
    const nativeQueries = new Set<string>([normalizedNativeTicker, "xch", "txch"]);

    availableCatTokens.forEach((token) => {
      const tokenTicker = token.ticker.toLowerCase();
      const tokenName = token.name.toLowerCase();

      const matchesToken = tokenQueries.some((query) => {
        if (nativeQueries.has(query)) {
          return tokenTicker === "xch";
        }
        return tokenTicker.includes(query) || tokenName.includes(query);
      });

      if (!matchesToken) {
        return;
      }

      if (parsed.mode === "directed") {
        const side = parsed.tokens[0]?.side;
        if (side === "buy") {
          addSingleSuggestion(token.ticker, "buyAsset", token.name);
        } else if (side === "sell") {
          addSingleSuggestion(token.ticker, "sellAsset", token.name);
        }
        return;
      }

      addSingleSuggestion(token.ticker, "buyAsset", token.name);
      addSingleSuggestion(token.ticker, "sellAsset", token.name);
    });

    effectiveRecentPairs.forEach((pair, index) => {
      const pairText = `${pair.buyAsset}/${pair.sellAsset}`.toLowerCase();
      const matchesPair = tokenQueries.some(
        (query) =>
          pair.buyAsset.toLowerCase().includes(query) ||
          pair.sellAsset.toLowerCase().includes(query) ||
          pairText.includes(query)
      );

      if (matchesPair) {
        addPairSuggestion(
          pair.buyAsset,
          pair.sellAsset,
          recentPairs.length > 0 && index < recentPairs.length ? "Recent pair" : "Top volume pair"
        );
      }
    });

    storeSetFilteredSuggestions(suggestions);
  }, [
    availableCatTokens,
    effectiveRecentPairs,
    filters.buyAsset,
    filters.sellAsset,
    network,
    recentPairs.length,
    searchValue,
    storeSetFilteredSuggestions,
  ]);

  // Stable action wrappers
  const setSearchValue = useCallback(
    (value: string) => {
      storeSetSearchValue(value);
    },
    [storeSetSearchValue]
  );

  const setFilteredSuggestions = useCallback(
    (suggestions: SuggestionItem[]) => {
      storeSetFilteredSuggestions(suggestions);
    },
    [storeSetFilteredSuggestions]
  );

  const addFilter = useCallback(
    (column: "buyAsset" | "sellAsset" | "status", value: string) => {
      storeAddFilter(column, value);
    },
    [storeAddFilter]
  );

  const removeFilter = useCallback(
    (column: "buyAsset" | "sellAsset" | "status", value: string) => {
      storeRemoveFilter(column, value);
    },
    [storeRemoveFilter]
  );

  const clearAllFilters = useCallback(() => {
    storeClearAllFilters();
  }, [storeClearAllFilters]);

  const swapBuySellAssets = useCallback(() => {
    storeSwapBuySellAssets();
  }, [storeSwapBuySellAssets]);

  const toggleFilterPane = useCallback(() => {
    storeToggleFilterPane();
  }, [storeToggleFilterPane]);

  const setShowFilterPane = useCallback(
    (show: boolean) => {
      storeSetShowFilterPane(show);
    },
    [storeSetShowFilterPane]
  );

  const setPagination = useCallback(
    (pagination: OrderBookPagination) => {
      storeSetPagination(pagination);
    },
    [storeSetPagination]
  );

  const setBuyAsset = useCallback(
    (assets: string[]) => {
      storeSetBuyAsset(assets);
    },
    [storeSetBuyAsset]
  );

  const setSellAsset = useCallback(
    (assets: string[]) => {
      storeSetSellAsset(assets);
    },
    [storeSetSellAsset]
  );

  const applyAssetPair = useCallback(
    (pair: AssetPair) => {
      if (pair.buyAsset.toLowerCase() === pair.sellAsset.toLowerCase()) {
        return;
      }
      storeSetBuyAsset([pair.buyAsset]);
      storeSetSellAsset([pair.sellAsset]);
      storeAddRecentPair(pair);
      storeSetSearchValue("");
    },
    [storeAddRecentPair, storeSetBuyAsset, storeSetSearchValue, storeSetSellAsset]
  );

  const applySuggestion = useCallback(
    (suggestion: SuggestionItem) => {
      if (suggestion.type === "pair" && suggestion.pairBuyAsset && suggestion.pairSellAsset) {
        applyAssetPair({
          buyAsset: suggestion.pairBuyAsset,
          sellAsset: suggestion.pairSellAsset,
        });
        return;
      }

      const column = suggestion.column as "buyAsset" | "sellAsset" | "status";
      const oppositeValues = column === "buyAsset" ? filters.sellAsset : filters.buyAsset;
      if (
        column !== "status" &&
        oppositeValues?.some((value) => value.toLowerCase() === suggestion.value.toLowerCase())
      ) {
        return;
      }
      storeAddFilter(column, suggestion.value);

      const nextBuyAsset =
        column === "buyAsset" ? suggestion.value : (filters.buyAsset?.[0] ?? undefined);
      const nextSellAsset =
        column === "sellAsset" ? suggestion.value : (filters.sellAsset?.[0] ?? undefined);

      if (nextBuyAsset && nextSellAsset) {
        storeAddRecentPair({
          buyAsset: nextBuyAsset,
          sellAsset: nextSellAsset,
        });
      }

      storeSetSearchValue("");
    },
    [
      applyAssetPair,
      filters.buyAsset,
      filters.sellAsset,
      storeAddFilter,
      storeAddRecentPair,
      storeSetSearchValue,
    ]
  );

  // Refresh function (placeholder - actual refresh handled by useOrderBook hook)
  const refreshOrderBook = useCallback(() => {
    // This is a no-op - the useOrderBook hook will automatically refetch when filters change
    // This function exists for API compatibility
  }, []);

  return {
    // State
    filters: memoizedFilters,
    pagination: memoizedFilters.pagination,
    searchValue,
    filteredSuggestions,
    recentPairs,
    suggestedPairs: effectiveRecentPairs,
    assetsSwapped,
    showFilterPane,
    hasActiveFilters,

    // Methods
    setSearchValue,
    setFilteredSuggestions,
    addFilter,
    removeFilter,
    clearAllFilters,
    swapBuySellAssets,
    toggleFilterPane,
    setShowFilterPane,
    setPagination,
    setBuyAsset,
    setSellAsset,
    applyAssetPair,
    applySuggestion,
    refreshOrderBook,
  };
}
