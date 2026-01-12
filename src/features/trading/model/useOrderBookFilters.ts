'use client'

import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OrderBookFilters, OrderBookPagination, SuggestionItem } from '../lib/orderBookTypes'

const STORAGE_KEY = 'orderBookFilterState'

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
  const [state, setState] = useState<FilterState>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          const loadedFilters = parsed.filters || defaultFilters

          // Ensure default filters are set if user hasn't explicitly cleared them
          if (!parsed.userClearedFilters) {
            // If loaded filters are empty, use defaults
            if (
              (!loadedFilters.buyAsset || loadedFilters.buyAsset.length === 0) &&
              (!loadedFilters.sellAsset || loadedFilters.sellAsset.length === 0)
            ) {
              const nativeTicker = getNativeTokenTicker()
              loadedFilters.buyAsset = [nativeTicker]
              loadedFilters.sellAsset = ['TBYC']
            }
          }

          // Ensure pagination is set
          if (!loadedFilters.pagination) {
            loadedFilters.pagination = DEFAULT_PAGINATION
          }

          return {
            filters: loadedFilters,
            searchValue: parsed.searchValue || '',
            filteredSuggestions: [],
            assetsSwapped: parsed.assetsSwapped || false,
            showFilterPane: parsed.showFilterPane || false,
            userClearedFilters: parsed.userClearedFilters || false,
          }
        }
      } catch (error) {
        // Silently fail - localStorage may not be available
        void error
      }
    }

    // Set default filter if no saved state
    const nativeTicker = getNativeTokenTicker()
    const defaultState: FilterState = {
      filters: {
        buyAsset: [nativeTicker],
        sellAsset: ['TBYC'],
        status: [],
        pagination: DEFAULT_PAGINATION,
      },
      searchValue: '',
      filteredSuggestions: [],
      assetsSwapped: false,
      showFilterPane: false,
      userClearedFilters: false,
    }

    return defaultState
  })

  // Ensure default filters are set on mount if not already set
  useEffect(() => {
    if (
      (!state.filters.buyAsset || state.filters.buyAsset.length === 0) &&
      (!state.filters.sellAsset || state.filters.sellAsset.length === 0) &&
      !state.userClearedFilters
    ) {
      const nativeTicker = getNativeTokenTicker()
      setState((prev) => ({
        ...prev,
        filters: {
          buyAsset: [nativeTicker],
          sellAsset: ['TBYC'],
          status: prev.filters.status || [],
        },
      }))
    }
  }, []) // Only run on mount

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = {
          filters: state.filters,
          searchValue: state.searchValue,
          assetsSwapped: state.assetsSwapped,
          userClearedFilters: state.userClearedFilters,
          showFilterPane: state.showFilterPane,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
      } catch (error) {
        // Silently fail - localStorage may not be available
        void error
      }
    }
  }, [state])

  // Invalidate and refetch queries when filters or pagination change
  // This ensures new API requests are made when filters change
  useEffect(() => {
    // Use a small delay to ensure state has fully updated
    const timeoutId = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orderBook'] })
      queryClient.refetchQueries({ queryKey: ['orderBook'] })
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [
    // Depend on the actual filter values, not the state object
    JSON.stringify(state.filters.buyAsset || []),
    JSON.stringify(state.filters.sellAsset || []),
    JSON.stringify(state.filters.status || []),
    state.filters.pagination,
    queryClient,
  ])

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
    // Use JSON.stringify for deep comparison since arrays are compared by reference
    JSON.stringify(state.filters.buyAsset || []),
    JSON.stringify(state.filters.sellAsset || []),
    JSON.stringify(state.filters.status || []),
    state.filters.pagination,
  ])

  const setSearchValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, searchValue: value }))
  }, [])

  const setFilteredSuggestions = useCallback((suggestions: SuggestionItem[]) => {
    setState((prev) => ({ ...prev, filteredSuggestions: suggestions }))
  }, [])

  const addFilter = useCallback((column: 'buyAsset' | 'sellAsset' | 'status', value: string) => {
    setState((prev) => {
      const newFilters = { ...prev.filters }
      const filterArray = (newFilters[column] as string[]) || []

      // Check if value already exists (case-insensitive)
      if (!filterArray.some((filter) => filter.toLowerCase() === value.toLowerCase())) {
        newFilters[column] = [...filterArray, value] as string[]
      }

      return {
        ...prev,
        filters: newFilters,
        searchValue: '',
        filteredSuggestions: [],
        userClearedFilters: false,
        showFilterPane: true, // Auto-show filter pane when filter is added
      }
    })
  }, [])

  const removeFilter = useCallback((column: 'buyAsset' | 'sellAsset' | 'status', value: string) => {
    setState((prev) => {
      const newFilters = { ...prev.filters }
      const filterArray = (newFilters[column] as string[]) || []
      const index = filterArray.findIndex((filter) => filter.toLowerCase() === value.toLowerCase())

      if (index > -1) {
        newFilters[column] = filterArray.filter((_, i) => i !== index) as string[]
      }

      return {
        ...prev,
        filters: newFilters,
      }
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: defaultFilters,
      searchValue: '',
      filteredSuggestions: [],
      userClearedFilters: true,
    }))
  }, [])

  const swapBuySellAssets = useCallback(() => {
    setState((prev) => {
      const tempBuyAssets = [...(prev.filters.buyAsset || [])]
      const tempSellAssets = [...(prev.filters.sellAsset || [])]

      const newState = {
        ...prev,
        filters: {
          ...prev.filters,
          buyAsset: tempSellAssets,
          sellAsset: tempBuyAssets,
        },
        assetsSwapped: !prev.assetsSwapped,
      }

      // Invalidate and refetch order book queries after state update
      // Use setTimeout to ensure state has updated before invalidating
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['orderBook'] })
        queryClient.refetchQueries({ queryKey: ['orderBook'] })
      }, 10)

      return newState
    })
  }, [queryClient])

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
    setSearchValue,
    setFilteredSuggestions,
    addFilter,
    removeFilter,
    clearAllFilters,
    swapBuySellAssets,
    toggleFilterPane,
    setShowFilterPane,
    setPagination,
    refreshOrderBook,
  }
}
