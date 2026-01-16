import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OrderBookFilters, SuggestionItem } from '../../lib/orderBookTypes'

interface UseOrderBookFilterActionsProps {
  setState: React.Dispatch<React.SetStateAction<{
    filters: OrderBookFilters
    searchValue: string
    filteredSuggestions: SuggestionItem[]
    assetsSwapped: boolean
    showFilterPane: boolean
    userClearedFilters: boolean
  }>>
  defaultFilters: OrderBookFilters
}

/**
 * Extract filter action handlers to reduce useOrderBookFilters size
 */
export function useOrderBookFilterActions({
  setState,
  defaultFilters,
}: UseOrderBookFilterActionsProps) {
  const queryClient = useQueryClient()

  const setSearchValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, searchValue: value }))
  }, [setState])

  const setFilteredSuggestions = useCallback((suggestions: SuggestionItem[]) => {
    setState((prev) => ({ ...prev, filteredSuggestions: suggestions }))
  }, [setState])

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
  }, [setState])

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
  }, [setState])

  const clearAllFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: defaultFilters,
      searchValue: '',
      filteredSuggestions: [],
      userClearedFilters: true,
    }))
  }, [setState, defaultFilters])

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
  }, [setState, queryClient])

  return {
    setSearchValue,
    setFilteredSuggestions,
    addFilter,
    removeFilter,
    clearAllFilters,
    swapBuySellAssets,
  }
}
