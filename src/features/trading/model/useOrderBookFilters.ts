'use client'

import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import type { OrderBookFilters, OrderBookPagination, SuggestionItem } from '../lib/orderBookTypes'
import {
  loadFilterStateFromStorage,
  createDefaultFilterState,
  saveFilterStateToStorage,
  clearFilterStateFromStorage,
} from '../lib/orderBookFilterStorage'
import { useOrderBookFilterActions } from './hooks/useOrderBookFilterActions'

interface FilterState {
  filters: OrderBookFilters
  searchValue: string
  filteredSuggestions: SuggestionItem[]
  assetsSwapped: boolean
  showFilterPane: boolean
  userClearedFilters: boolean
}

const DEFAULT_PAGINATION: OrderBookPagination = 50

const defaultFilters: OrderBookFilters = {
  buyAsset: [],
  sellAsset: [],
  status: [],
  pagination: DEFAULT_PAGINATION,
}

export function useOrderBookFilters() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()
  const prevNetworkRef = useRef<typeof network | null>(null)
  const [state, setState] = useState<FilterState>(() => {
    const loadedState = loadFilterStateFromStorage()
    return loadedState || createDefaultFilterState()
  })

  // Clear all filters when network changes
  useEffect(() => {
    // Clear filters when network changes (but not on initial mount)
    if (prevNetworkRef.current !== null && prevNetworkRef.current !== network) {
      // Network changed - clear all filters
      setState((prev) => ({
        ...prev,
        filters: defaultFilters,
        searchValue: '',
        filteredSuggestions: [],
        assetsSwapped: false,
        userClearedFilters: true,
      }))
      clearFilterStateFromStorage()
    }

    prevNetworkRef.current = network
  }, [network])

  // Ensure default filters are set on mount if not already set
  useEffect(() => {
    if (
      (!state.filters.buyAsset || state.filters.buyAsset.length === 0) &&
      (!state.filters.sellAsset || state.filters.sellAsset.length === 0) &&
      !state.userClearedFilters
    ) {
      const nativeTicker = getNativeTokenTickerForNetwork(network)
      setState((prev) => ({
        ...prev,
        filters: {
          buyAsset: [nativeTicker],
          sellAsset: ['TBYC'],
          status: prev.filters.status || [],
        },
      }))
    }
  }, [network, state.filters.buyAsset, state.filters.sellAsset, state.userClearedFilters])

  // Save to localStorage whenever relevant state changes
  // Create a stable key for comparison to prevent unnecessary saves
  const stateKey = useMemo(
    () =>
      JSON.stringify({
        buyAsset: state.filters.buyAsset || [],
        sellAsset: state.filters.sellAsset || [],
        status: state.filters.status || [],
        pagination: state.filters.pagination,
        searchValue: state.searchValue,
        assetsSwapped: state.assetsSwapped,
        userClearedFilters: state.userClearedFilters,
        showFilterPane: state.showFilterPane,
      }),
    [state]
  )
  const prevStateKeyRef = useRef<string>('')

  useEffect(() => {
    // Only save if state actually changed
    if (stateKey !== prevStateKeyRef.current) {
      prevStateKeyRef.current = stateKey
      saveFilterStateToStorage(state)
    }
  }, [state, stateKey])

  // Invalidate and refetch queries when filters or pagination change
  // This ensures new API requests are made when filters change
  const buyAssetKey = JSON.stringify(state.filters.buyAsset || [])
  const sellAssetKey = JSON.stringify(state.filters.sellAsset || [])
  const statusKey = JSON.stringify(state.filters.status || [])

  useEffect(() => {
    // Use a small delay to ensure state has fully updated
    const timeoutId = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orderBook'] })
      queryClient.refetchQueries({ queryKey: ['orderBook'] })
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [buyAssetKey, sellAssetKey, statusKey, state.filters.pagination, queryClient])

  const hasActiveFilters = useMemo(() => {
    return (
      (state.filters.buyAsset && state.filters.buyAsset.length > 0) ||
      (state.filters.sellAsset && state.filters.sellAsset.length > 0) ||
      (state.filters.status && state.filters.status.length > 0)
    )
  }, [state.filters.buyAsset, state.filters.sellAsset, state.filters.status])

  // Return filters as a new object reference when filters change to ensure reactivity
  // This ensures useOrderBook hook detects filter changes via query key
  const filters = useMemo(() => {
    // Create new arrays to ensure reference changes
    return {
      buyAsset: state.filters.buyAsset ? [...state.filters.buyAsset] : [],
      sellAsset: state.filters.sellAsset ? [...state.filters.sellAsset] : [],
      status: state.filters.status ? [...state.filters.status] : [],
      pagination: state.filters.pagination || DEFAULT_PAGINATION,
    }
  }, [
    state.filters.buyAsset,
    state.filters.sellAsset,
    state.filters.status,
    state.filters.pagination,
  ])

  // Extract filter action handlers
  const filterActions = useOrderBookFilterActions({
    setState,
    defaultFilters,
  })

  const toggleFilterPane = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showFilterPane: !prev.showFilterPane,
    }))
  }, [])

  const setShowFilterPane = useCallback((show: boolean) => {
    setState((prev) => ({
      ...prev,
      showFilterPane: show,
    }))
  }, [])

  // Set pagination
  const setPagination = useCallback((pagination: OrderBookPagination) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        pagination,
      },
    }))
  }, [])

  // Refresh function (placeholder - actual refresh handled by useOrderBook hook)
  const refreshOrderBook = useCallback(() => {
    // This is a no-op - the useOrderBook hook will automatically refetch when filters change
    // This function exists for API compatibility
  }, [])

  return {
    // State
    filters,
    pagination: filters.pagination || DEFAULT_PAGINATION,
    searchValue: state.searchValue,
    filteredSuggestions: state.filteredSuggestions,
    assetsSwapped: state.assetsSwapped,
    showFilterPane: state.showFilterPane,
    hasActiveFilters,

    // Methods
    setSearchValue: filterActions.setSearchValue,
    setFilteredSuggestions: filterActions.setFilteredSuggestions,
    addFilter: filterActions.addFilter,
    removeFilter: filterActions.removeFilter,
    clearAllFilters: filterActions.clearAllFilters,
    swapBuySellAssets: filterActions.swapBuySellAssets,
    toggleFilterPane,
    setShowFilterPane,
    setPagination,
    refreshOrderBook,
  }
}
