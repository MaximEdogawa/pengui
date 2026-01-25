'use client'

import { useCallback, useState } from 'react'
import type { TradeHistoryOfferItem } from './useTradeHistory'

export type SortColumn = 'date' | 'price' | 'requested' | 'offered' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: SortColumn | null
  direction: SortDirection
}

const defaultSort: SortConfig = {
  column: 'date',
  direction: 'desc',
}

function getOfferMainDate(item: TradeHistoryOfferItem): number {
  const o = item.offer
  if (o.date_completed) return new Date(o.date_completed).getTime()
  if (o.date_pending) return new Date(o.date_pending).getTime()
  return new Date(o.date_found).getTime()
}

function getPrice(item: TradeHistoryOfferItem): number {
  return item.offer.price ?? 0
}

function getRequestedAmount(item: TradeHistoryOfferItem): number {
  const r = item.offer.requested?.[0]
  return r?.amount ?? 0
}

function getOfferedAmount(item: TradeHistoryOfferItem): number {
  const o = item.offer.offered?.[0]
  return o?.amount ?? 0
}

function getSortValue(item: TradeHistoryOfferItem, column: SortColumn): number | string {
  switch (column) {
    case 'date':
      return getOfferMainDate(item)
    case 'price':
      return getPrice(item)
    case 'requested':
      return getRequestedAmount(item)
    case 'offered':
      return getOfferedAmount(item)
    case 'status':
      return item.offerState
    default:
      return 0
  }
}

function compareValues(aValue: number | string, bValue: number | string, direction: SortDirection): number {
  const aIsNullish = aValue === undefined || aValue === null
  const bIsNullish = bValue === undefined || bValue === null

  if (aIsNullish && bIsNullish) return 0
  if (aIsNullish) return 1
  if (bIsNullish) return -1

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
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'desc' }
    })
  }, [])

  const sortTrades = useCallback(
    (items: TradeHistoryOfferItem[]): TradeHistoryOfferItem[] => {
      if (!sortConfig.column) return items
      const { column, direction } = sortConfig
      return [...items].sort((a, b) => {
        const aVal = getSortValue(a, column)
        const bVal = getSortValue(b, column)
        return compareValues(aVal, bVal, direction)
      })
    },
    [sortConfig]
  )

  return {
    sortConfig,
    setSort,
    sortTrades,
  }
}
