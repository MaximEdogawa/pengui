'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useOrderBookFilters as useOrderBookFiltersImpl } from './useOrderBookFilters'

interface OrderBookFiltersContextValue {
  filters: ReturnType<typeof useOrderBookFiltersImpl>['filters']
  searchValue: ReturnType<typeof useOrderBookFiltersImpl>['searchValue']
  filteredSuggestions: ReturnType<typeof useOrderBookFiltersImpl>['filteredSuggestions']
  assetsSwapped: ReturnType<typeof useOrderBookFiltersImpl>['assetsSwapped']
  showFilterPane: ReturnType<typeof useOrderBookFiltersImpl>['showFilterPane']
  hasActiveFilters: ReturnType<typeof useOrderBookFiltersImpl>['hasActiveFilters']
  pagination: ReturnType<typeof useOrderBookFiltersImpl>['pagination']
  setSearchValue: ReturnType<typeof useOrderBookFiltersImpl>['setSearchValue']
  setFilteredSuggestions: ReturnType<typeof useOrderBookFiltersImpl>['setFilteredSuggestions']
  addFilter: ReturnType<typeof useOrderBookFiltersImpl>['addFilter']
  removeFilter: ReturnType<typeof useOrderBookFiltersImpl>['removeFilter']
  clearAllFilters: ReturnType<typeof useOrderBookFiltersImpl>['clearAllFilters']
  swapBuySellAssets: ReturnType<typeof useOrderBookFiltersImpl>['swapBuySellAssets']
  toggleFilterPane: ReturnType<typeof useOrderBookFiltersImpl>['toggleFilterPane']
  setShowFilterPane: ReturnType<typeof useOrderBookFiltersImpl>['setShowFilterPane']
  setPagination: ReturnType<typeof useOrderBookFiltersImpl>['setPagination']
  refreshOrderBook: ReturnType<typeof useOrderBookFiltersImpl>['refreshOrderBook']
}

const OrderBookFiltersContext = createContext<OrderBookFiltersContextValue | undefined>(undefined)

export function OrderBookFiltersProvider({ children }: { children: ReactNode }) {
  const filtersState = useOrderBookFiltersImpl()

  return (
    <OrderBookFiltersContext.Provider value={filtersState}>
      {children}
    </OrderBookFiltersContext.Provider>
  )
}

export function useOrderBookFilters() {
  const context = useContext(OrderBookFiltersContext)
  if (context === undefined) {
    throw new Error('useOrderBookFilters must be used within an OrderBookFiltersProvider')
  }
  return context
}
