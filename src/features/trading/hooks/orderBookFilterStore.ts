"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OrderBookFilters, OrderBookPagination, SuggestionItem } from "../lib/orderBookTypes";

const DEFAULT_PAGINATION: OrderBookPagination = 50;

interface OrderBookFilterState {
  // Filter state
  filters: OrderBookFilters;
  searchValue: string;
  filteredSuggestions: SuggestionItem[];
  assetsSwapped: boolean;
  showFilterPane: boolean;
  userClearedFilters: boolean;
  // Network the filters were saved for (for validation)
  savedNetwork: "mainnet" | "testnet" | null;
  // Hydration flag - true after localStorage has been loaded
  _hasHydrated: boolean;
}

interface OrderBookFilterActions {
  // Setters
  setFilters: (filters: OrderBookFilters) => void;
  setBuyAsset: (assets: string[]) => void;
  setSellAsset: (assets: string[]) => void;
  setStatus: (status: string[]) => void;
  setPagination: (pagination: OrderBookPagination) => void;
  setSearchValue: (value: string) => void;
  setFilteredSuggestions: (suggestions: SuggestionItem[]) => void;
  setAssetsSwapped: (swapped: boolean) => void;
  setShowFilterPane: (show: boolean) => void;
  setUserClearedFilters: (cleared: boolean) => void;
  setSavedNetwork: (network: "mainnet" | "testnet") => void;

  // Actions
  addFilter: (column: "buyAsset" | "sellAsset" | "status", value: string) => void;
  removeFilter: (column: "buyAsset" | "sellAsset" | "status", value: string) => void;
  clearAllFilters: () => void;
  swapBuySellAssets: () => void;
  toggleFilterPane: () => void;
  resetToDefaults: (network: "mainnet" | "testnet") => void;
  clearForNetworkChange: (newNetwork: "mainnet" | "testnet") => void;

  // Internal
  _setHasHydrated: (hasHydrated: boolean) => void;
}

type OrderBookFilterStore = OrderBookFilterState & OrderBookFilterActions;

const createDefaultFilters = (_network: "mainnet" | "testnet" = "mainnet"): OrderBookFilters => {
  return {
    buyAsset: [],
    sellAsset: [],
    status: [],
    pagination: DEFAULT_PAGINATION,
  };
};

const createDefaultState = (
  network: "mainnet" | "testnet" = "mainnet"
): Omit<OrderBookFilterState, "_hasHydrated"> => ({
  filters: createDefaultFilters(network),
  searchValue: "",
  filteredSuggestions: [],
  assetsSwapped: false,
  showFilterPane: false,
  userClearedFilters: false,
  savedNetwork: network,
});

export const useOrderBookFilterStore = create<OrderBookFilterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...createDefaultState("mainnet"),
      _hasHydrated: false,

      // Setters
      setFilters: (filters) => set({ filters }),

      setBuyAsset: (assets) =>
        set((state) => ({
          filters: { ...state.filters, buyAsset: assets },
        })),

      setSellAsset: (assets) =>
        set((state) => ({
          filters: { ...state.filters, sellAsset: assets },
        })),

      setStatus: (status) =>
        set((state) => ({
          filters: { ...state.filters, status },
        })),

      setPagination: (pagination) =>
        set((state) => ({
          filters: { ...state.filters, pagination },
        })),

      setSearchValue: (searchValue) => set({ searchValue }),

      setFilteredSuggestions: (filteredSuggestions) => set({ filteredSuggestions }),

      setAssetsSwapped: (assetsSwapped) => set({ assetsSwapped }),

      setShowFilterPane: (showFilterPane) => set({ showFilterPane }),

      setUserClearedFilters: (userClearedFilters) => set({ userClearedFilters }),

      setSavedNetwork: (savedNetwork) => set({ savedNetwork }),

      // Actions
      addFilter: (column, value) =>
        set((state) => {
          const currentValues = state.filters[column] || [];
          if (currentValues.includes(value)) {
            return state; // Already exists
          }
          return {
            filters: {
              ...state.filters,
              [column]: [...currentValues, value],
            },
            userClearedFilters: false,
          };
        }),

      removeFilter: (column, value) =>
        set((state) => {
          const currentValues = state.filters[column] || [];
          return {
            filters: {
              ...state.filters,
              [column]: currentValues.filter((v) => v !== value),
            },
          };
        }),

      clearAllFilters: () =>
        set((state) => ({
          filters: {
            buyAsset: [],
            sellAsset: [],
            status: [],
            pagination: state.filters.pagination || DEFAULT_PAGINATION,
          },
          searchValue: "",
          filteredSuggestions: [],
          assetsSwapped: false,
          userClearedFilters: true,
        })),

      swapBuySellAssets: () =>
        set((state) => ({
          filters: {
            ...state.filters,
            buyAsset: state.filters.sellAsset || [],
            sellAsset: state.filters.buyAsset || [],
          },
          assetsSwapped: !state.assetsSwapped,
        })),

      toggleFilterPane: () =>
        set((state) => ({
          showFilterPane: !state.showFilterPane,
        })),

      resetToDefaults: (network) =>
        set((state) => ({
          ...createDefaultState(network),
          _hasHydrated: state._hasHydrated, // Preserve hydration flag
        })),

      clearForNetworkChange: (newNetwork) => {
        const state = get();
        // If network changed, clear everything and reset to defaults
        if (state.savedNetwork !== newNetwork) {
          set({
            ...createDefaultState(newNetwork),
            _hasHydrated: state._hasHydrated, // Preserve hydration flag
          });
        }
      },

      // Internal: set hydration flag (called after rehydration)
      _setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "orderBookFilterState",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields (exclude filteredSuggestions and _hasHydrated)
      partialize: (state) => ({
        filters: state.filters,
        searchValue: state.searchValue,
        assetsSwapped: state.assetsSwapped,
        showFilterPane: state.showFilterPane,
        userClearedFilters: state.userClearedFilters,
        savedNetwork: state.savedNetwork,
      }),
      // Handle rehydration - set flag when complete
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          // Ensure filteredSuggestions is always an array (not persisted)
          state.filteredSuggestions = [];

          // If filters are effectively empty and the user has not explicitly cleared them,
          // apply network-specific defaults so Trading shows a sensible initial pair.
          const buy = state.filters.buyAsset ?? [];
          const sell = state.filters.sellAsset ?? [];
          const status = state.filters.status ?? [];
          const hasAnyFilters = buy.length > 0 || sell.length > 0 || status.length > 0;
          if (!hasAnyFilters && !state.userClearedFilters) {
            const net = state.savedNetwork ?? "mainnet";
            if (net === "mainnet") {
              state.filters.buyAsset = ["XCH"];
              state.filters.sellAsset = ["BYC"];
            } else {
              state.filters.buyAsset = ["TXCH"];
              state.filters.sellAsset = ["TBYC"];
            }
          }
        }
        // Mark as hydrated (even on error, we should proceed)
        useOrderBookFilterStore.setState({ _hasHydrated: true });
      },
    }
  )
);

// Selector hooks for common patterns
export const useOrderBookFiltersOnly = () => useOrderBookFilterStore((state) => state.filters);

export const useOrderBookPagination = () =>
  useOrderBookFilterStore((state) => state.filters.pagination || DEFAULT_PAGINATION);

export const useHasActiveFilters = () =>
  useOrderBookFilterStore((state) => {
    const { buyAsset, sellAsset, status } = state.filters;
    return (
      (buyAsset && buyAsset.length > 0) ||
      (sellAsset && sellAsset.length > 0) ||
      (status && status.length > 0)
    );
  });

// Hook to check if store has been hydrated from localStorage
export const useHasHydrated = () => useOrderBookFilterStore((state) => state._hasHydrated);

/**
 * Clear all filters and update network - can be called outside React components
 * Use this when network changes to ensure filters are cleared
 */
export const clearFiltersForNetworkChange = (newNetwork: "mainnet" | "testnet") => {
  const store = useOrderBookFilterStore.getState();
  store.clearAllFilters();
  store.setSavedNetwork(newNetwork);
};
