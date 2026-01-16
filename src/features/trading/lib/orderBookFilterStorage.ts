import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import type { OrderBookFilters, OrderBookPagination, SuggestionItem } from './orderBookTypes'

const STORAGE_KEY = 'orderBookFilterState'
const DEFAULT_PAGINATION: OrderBookPagination = 50

interface FilterState {
  filters: OrderBookFilters
  searchValue: string
  filteredSuggestions: SuggestionItem[]
  assetsSwapped: boolean
  showFilterPane: boolean
  userClearedFilters: boolean
}

const defaultFilters: OrderBookFilters = {
  buyAsset: [],
  sellAsset: [],
  status: [],
  pagination: DEFAULT_PAGINATION,
}

/**
 * Load filter state from localStorage
 */
export function loadFilterStateFromStorage(): FilterState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return null
    }

    const parsed = JSON.parse(saved)
    const loadedFilters = parsed.filters || defaultFilters

    // Ensure default filters are set if user hasn't explicitly cleared them
    if (!parsed.userClearedFilters) {
      if (
        (!loadedFilters.buyAsset || loadedFilters.buyAsset.length === 0) &&
        (!loadedFilters.sellAsset || loadedFilters.sellAsset.length === 0)
      ) {
        const nativeTicker = getNativeTokenTickerForNetwork('mainnet')
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
  } catch {
    // Silently fail - localStorage may not be available
    return null
  }
}

/**
 * Create default filter state
 */
export function createDefaultFilterState(): FilterState {
  const nativeTicker = getNativeTokenTickerForNetwork('mainnet')
  return {
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
}

/**
 * Save filter state to localStorage
 */
export function saveFilterStateToStorage(state: FilterState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const stateToSave = {
      filters: state.filters,
      searchValue: state.searchValue,
      assetsSwapped: state.assetsSwapped,
      userClearedFilters: state.userClearedFilters,
      showFilterPane: state.showFilterPane,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  } catch {
    // Silently fail - localStorage may not be available
  }
}

/**
 * Clear filter state from localStorage
 */
export function clearFilterStateFromStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail
  }
}
