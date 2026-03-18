'use client'

import { useNetwork } from '@/shared/hooks/useNetwork'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { OrderBookPagination, SuggestionItem } from '../lib/orderBookTypes'
import { useOrderBookFilterStore, useHasActiveFilters, useHasHydrated } from './orderBookFilterStore'
import { usePriceDataPrefetch } from './usePriceDataPrefetch'

const DEFAULT_PAGINATION: OrderBookPagination = 50

export function useOrderBookFilters() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()
  const prevNetworkRef = useRef<typeof network | null>(null)

  // Get state from Zustand store (reactive)
  const filters = useOrderBookFilterStore((state) => state.filters)
  const searchValue = useOrderBookFilterStore((state) => state.searchValue)
  const filteredSuggestions = useOrderBookFilterStore((state) => state.filteredSuggestions)
  const assetsSwapped = useOrderBookFilterStore((state) => state.assetsSwapped)
  const showFilterPane = useOrderBookFilterStore((state) => state.showFilterPane)
  const savedNetwork = useOrderBookFilterStore((state) => state.savedNetwork)
  const hasActiveFilters = useHasActiveFilters()
  const hasHydrated = useHasHydrated()
  const userClearedFilters = useOrderBookFilterStore((state) => state.userClearedFilters)

  // Get actions directly from store for network change handling
  const storeClearFiltersForNetwork = useOrderBookFilterStore((state) => state.clearAllFilters)
  const setSavedNetwork = useOrderBookFilterStore((state) => state.setSavedNetwork)
  const storeSetBuyAsset = useOrderBookFilterStore((state) => state.setBuyAsset)
  const storeSetSellAsset = useOrderBookFilterStore((state) => state.setSellAsset)

  // Handle network changes - clear ALL filters when network changes
  // Wait for hydration to complete before making network-based decisions
  useEffect(() => {
    // Don't run until store has been hydrated from localStorage
    if (!hasHydrated) return

    const applyDefaultPairForNetwork = (net: typeof network) => {
      if (net === 'mainnet') {
        // Default mainnet pair: XCH/BYC
        storeSetBuyAsset(['XCH'])
        storeSetSellAsset(['BYC'])
      } else {
        // Default testnet pair: TXCH/TBYC
        storeSetBuyAsset(['TXCH'])
        storeSetSellAsset(['TBYC'])
      }
    }

    if (prevNetworkRef.current === null) {
      // Initial mount (after hydration)
      if (savedNetwork !== null && savedNetwork !== network) {
        // Stored network does not match current -> reset and apply defaults for current network
        storeClearFiltersForNetwork()
        setSavedNetwork(network)
        applyDefaultPairForNetwork(network)
      } else {
        // Either no saved network or it matches current.
        // If there are no active filters and the user hasn't explicitly cleared them,
        // apply network-specific defaults and persist them.
        if (!hasActiveFilters && !userClearedFilters) {
          applyDefaultPairForNetwork(network)
        }
        if (savedNetwork === null) {
          setSavedNetwork(network)
        }
      }
      prevNetworkRef.current = network
    } else if (prevNetworkRef.current !== network) {
      // Network changed - clear all filters and update network
      storeClearFiltersForNetwork()
      setSavedNetwork(network)
      applyDefaultPairForNetwork(network)
      prevNetworkRef.current = network
    }
  }, [network, savedNetwork, hasHydrated, hasActiveFilters, userClearedFilters, storeClearFiltersForNetwork, setSavedNetwork, storeSetBuyAsset, storeSetSellAsset])

  // Invalidate queries when filters or pagination change
  const buyAssetKey = JSON.stringify(filters.buyAsset || [])
  const sellAssetKey = JSON.stringify(filters.sellAsset || [])
  const statusKey = JSON.stringify(filters.status || [])
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Skip until hydrated and network effect has run
    if (!hasHydrated || prevNetworkRef.current === null) {
      return
    }

    // Skip the first run after initialization to avoid unnecessary invalidation
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      return
    }

    // Use a small delay to ensure state has fully updated
    const timeoutId = setTimeout(() => {
      // Only invalidate - TanStack Query will automatically refetch active queries
      queryClient.invalidateQueries({ queryKey: ['orderBook'] })
      // Also invalidate price data queries when filters change
      queryClient.invalidateQueries({ queryKey: ['priceData'] })
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [buyAssetKey, sellAssetKey, statusKey, filters.pagination, queryClient, hasHydrated])

  // Return filters as a new object reference when filters change to ensure reactivity
  const memoizedFilters = useMemo(() => ({
    buyAsset: filters.buyAsset ? [...filters.buyAsset] : [],
    sellAsset: filters.sellAsset ? [...filters.sellAsset] : [],
    status: filters.status ? [...filters.status] : [],
    pagination: filters.pagination || DEFAULT_PAGINATION,
  }), [filters.buyAsset, filters.sellAsset, filters.status, filters.pagination])

  // Prefetch price data when filters change
  usePriceDataPrefetch(memoizedFilters)

  // Get action functions directly from store (these are stable references)
  const storeSetSearchValue = useOrderBookFilterStore((state) => state.setSearchValue)
  const storeSetFilteredSuggestions = useOrderBookFilterStore((state) => state.setFilteredSuggestions)
  const storeAddFilter = useOrderBookFilterStore((state) => state.addFilter)
  const storeRemoveFilter = useOrderBookFilterStore((state) => state.removeFilter)
  const storeClearAllFilters = useOrderBookFilterStore((state) => state.clearAllFilters)
  const storeSwapBuySellAssets = useOrderBookFilterStore((state) => state.swapBuySellAssets)
  const storeToggleFilterPane = useOrderBookFilterStore((state) => state.toggleFilterPane)
  const storeSetShowFilterPane = useOrderBookFilterStore((state) => state.setShowFilterPane)
  const storeSetPagination = useOrderBookFilterStore((state) => state.setPagination)
  const storeSetBuyAsset = useOrderBookFilterStore((state) => state.setBuyAsset)
  const storeSetSellAsset = useOrderBookFilterStore((state) => state.setSellAsset)

  // Stable action wrappers
  const setSearchValue = useCallback((value: string) => {
    storeSetSearchValue(value)
  }, [storeSetSearchValue])

  const setFilteredSuggestions = useCallback((suggestions: SuggestionItem[]) => {
    storeSetFilteredSuggestions(suggestions)
  }, [storeSetFilteredSuggestions])

  const addFilter = useCallback((column: 'buyAsset' | 'sellAsset' | 'status', value: string) => {
    storeAddFilter(column, value)
  }, [storeAddFilter])

  const removeFilter = useCallback((column: 'buyAsset' | 'sellAsset' | 'status', value: string) => {
    storeRemoveFilter(column, value)
  }, [storeRemoveFilter])

  const clearAllFilters = useCallback(() => {
    storeClearAllFilters()
  }, [storeClearAllFilters])

  const swapBuySellAssets = useCallback(() => {
    storeSwapBuySellAssets()
  }, [storeSwapBuySellAssets])

  const toggleFilterPane = useCallback(() => {
    storeToggleFilterPane()
  }, [storeToggleFilterPane])

  const setShowFilterPane = useCallback((show: boolean) => {
    storeSetShowFilterPane(show)
  }, [storeSetShowFilterPane])

  const setPagination = useCallback((pagination: OrderBookPagination) => {
    storeSetPagination(pagination)
  }, [storeSetPagination])

  const setBuyAsset = useCallback((assets: string[]) => {
    storeSetBuyAsset(assets)
  }, [storeSetBuyAsset])

  const setSellAsset = useCallback((assets: string[]) => {
    storeSetSellAsset(assets)
  }, [storeSetSellAsset])

  // Refresh function (placeholder - actual refresh handled by useOrderBook hook)
  const refreshOrderBook = useCallback(() => {
    // This is a no-op - the useOrderBook hook will automatically refetch when filters change
    // This function exists for API compatibility
  }, [])

  return {
    // State
    filters: memoizedFilters,
    pagination: memoizedFilters.pagination,
    searchValue,
    filteredSuggestions,
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
    refreshOrderBook,
  }
}
