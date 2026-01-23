'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { logger } from '@/shared/lib/logger'

export type TradeTypeFilter = 'buy' | 'sell' | 'all'
export type DateRangePreset = 'today' | '7days' | '30days' | 'custom'

export interface TradeHistoryFilters {
  dateRange: {
    preset: DateRangePreset
    customFrom?: Date
    customTo?: Date
  }
  tradeType: TradeTypeFilter
  myTradesOnly: boolean
}

const STORAGE_KEY = 'trade-history-filters'

const defaultFilters: TradeHistoryFilters = {
  dateRange: {
    preset: '30days',
  },
  tradeType: 'all',
  myTradesOnly: false,
}

function loadFiltersFromStorage(): TradeHistoryFilters | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate and merge with defaults
      return {
        ...defaultFilters,
        ...parsed,
        dateRange: {
          ...defaultFilters.dateRange,
          ...parsed.dateRange,
        },
      }
    }
  } catch (error) {
    logger.error('Failed to load trade history filters from storage:', error)
  }

  return null
}

function saveFiltersToStorage(filters: TradeHistoryFilters): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    logger.error('Failed to save trade history filters to storage:', error)
  }
}

export function useTradeHistoryFilters() {
  const [filters, setFilters] = useState<TradeHistoryFilters>(() => {
    return loadFiltersFromStorage() || defaultFilters
  })

  // Save to localStorage whenever filters change
  useEffect(() => {
    saveFiltersToStorage(filters)
  }, [filters])

  const setDateRangePreset = useCallback((preset: DateRangePreset) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        preset,
        customFrom: preset === 'custom' ? prev.dateRange.customFrom : undefined,
        customTo: preset === 'custom' ? prev.dateRange.customTo : undefined,
      },
    }))
  }, [])

  const setCustomDateRange = useCallback((from: Date, to: Date) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        preset: 'custom',
        customFrom: from,
        customTo: to,
      },
    }))
  }, [])

  const setTradeType = useCallback((type: TradeTypeFilter) => {
    setFilters((prev) => ({
      ...prev,
      tradeType: type,
    }))
  }, [])

  const setMyTradesOnly = useCallback((enabled: boolean) => {
    setFilters((prev) => ({
      ...prev,
      myTradesOnly: enabled,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Calculate date range from preset
  const dateRange = useMemo(() => {
    const now = new Date()
    const { preset, customFrom, customTo } = filters.dateRange

    switch (preset) {
      case 'today': {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        return { from: start, to: now }
      }
      case '7days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 7)
        return { from: start, to: now }
      }
      case '30days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 30)
        return { from: start, to: now }
      }
      case 'custom': {
        if (customFrom && customTo) {
          return { from: customFrom, to: customTo }
        }
        // Fallback to 30 days if custom dates not set
        const start = new Date(now)
        start.setDate(start.getDate() - 30)
        return { from: start, to: now }
      }
      default:
        return null
    }
  }, [filters.dateRange])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRange.preset !== '30days' ||
      filters.tradeType !== 'all' ||
      filters.myTradesOnly
    )
  }, [filters])

  return {
    filters,
    dateRange,
    hasActiveFilters,
    setDateRangePreset,
    setCustomDateRange,
    setTradeType,
    setMyTradesOnly,
    clearFilters,
  }
}
