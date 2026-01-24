'use client'

import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/shared/lib/logger'

export interface TradeHistoryFilters {
  myTradesOnly: boolean
  showCompleted: boolean
  showCancelled: boolean
  showPending: boolean
}

const STORAGE_KEY = 'trade-history-filters'

const defaultFilters: TradeHistoryFilters = {
  myTradesOnly: false,
  showCompleted: true,
  showCancelled: true,
  showPending: true,
}

function loadFiltersFromStorage(): TradeHistoryFilters | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...defaultFilters,
        ...parsed,
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
    const loaded = loadFiltersFromStorage()
    return loaded ? { ...defaultFilters, ...loaded } : defaultFilters
  })

  useEffect(() => {
    saveFiltersToStorage(filters)
  }, [filters])

  const setMyTradesOnly = useCallback((enabled: boolean) => {
    setFilters((prev) => ({ ...prev, myTradesOnly: enabled }))
  }, [])

  const setShowCompleted = useCallback((v: boolean) => {
    setFilters((prev) => ({ ...prev, showCompleted: v }))
  }, [])

  const setShowCancelled = useCallback((v: boolean) => {
    setFilters((prev) => ({ ...prev, showCancelled: v }))
  }, [])

  const setShowPending = useCallback((v: boolean) => {
    setFilters((prev) => ({ ...prev, showPending: v }))
  }, [])

  return {
    filters,
    setMyTradesOnly,
    setShowCompleted,
    setShowCancelled,
    setShowPending,
  }
}
