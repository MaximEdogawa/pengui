'use client'

import { useCallback, useState } from 'react'
import type { TradeHistoryItem } from '@/shared/lib/services/myTradesService'
import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'

export type SortColumn = 'date' | 'price' | 'volume' | 'totalValue' | 'profitLoss'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: SortColumn | null
  direction: SortDirection
}

const defaultSort: SortConfig = {
  column: 'date',
  direction: 'desc',
}

export type TradeItem = TradeHistoryItem | (DexieHistoricalTrade & { isMyTrade?: boolean })

// Helper functions to extract values (outside component to avoid dependency issues)
function getTimestamp(trade: TradeItem): number {
  if ('timestamp' in trade) return trade.timestamp ?? 0
  if ('trade_timestamp' in trade) return (trade.trade_timestamp || 0) * 1000
  return 0
}

function getPrice(trade: TradeItem): number {
  return 'price' in trade ? (trade.price ?? 0) : 0
}

function getVolume(trade: TradeItem): number {
  if ('volume' in trade) return trade.volume ?? 0
  if ('base_volume' in trade) return trade.base_volume ?? 0
  return 0
}

function getTotalValue(trade: TradeItem): number {
  if ('totalValue' in trade) return trade.totalValue ?? 0
  return getPrice(trade) * getVolume(trade)
}

function getProfitLoss(trade: TradeItem): number {
  return 'profitLoss' in trade ? (trade.profitLoss ?? 0) : 0
}

function getSortValue(trade: TradeItem, column: SortColumn): number | string {
  switch (column) {
    case 'date':
      return getTimestamp(trade)
    case 'price':
      return getPrice(trade)
    case 'volume':
      return getVolume(trade)
    case 'totalValue':
      return getTotalValue(trade)
    case 'profitLoss':
      return getProfitLoss(trade)
    default:
      return 0
  }
}

function compareValues(aValue: number | string, bValue: number | string, direction: SortDirection): number {
  if (aValue === undefined || aValue === null) return 1
  if (bValue === undefined || bValue === null) return -1

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return direction === 'asc' ? aValue - bValue : bValue - aValue
  }

  const aStr = String(aValue)
  const bStr = String(bValue)
  return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
}

export function useTradeHistorySorting() {
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort)

  const setSort = useCallback((column: SortColumn) => {
    setSortConfig((prev) => {
      // If clicking the same column, toggle direction
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      // Otherwise, set new column with default direction
      return {
        column,
        direction: 'desc',
      }
    })
  }, [])

  const sortTrades = useCallback(
    (trades: TradeItem[]): TradeItem[] => {
      if (!sortConfig.column) {
        return trades
      }

      const column = sortConfig.column
      const direction = sortConfig.direction

      return [...trades].sort((a, b) => {
        const aValue = getSortValue(a, column)
        const bValue = getSortValue(b, column)
        return compareValues(aValue, bValue, direction)
      })
    },
    [sortConfig.column, sortConfig.direction]
  )

  return {
    sortConfig,
    setSort,
    sortTrades,
  }
}
