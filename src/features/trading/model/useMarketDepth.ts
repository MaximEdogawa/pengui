'use client'

import { useMemo } from 'react'
import { useOrderBook } from './useOrderBook'
import { useOrderBookFiltering } from '../composables/useOrderBookFiltering'
import { transformOrderBookForChart } from '../lib/utils/chartUtils'
import { aggregateDepthByPriceLevel } from '../lib/utils/depthUtils'
import type { MarketDepthData } from '../lib/chartTypes'
import type { OrderBookFilters } from '../lib/orderBookTypes'

interface UseMarketDepthOptions {
  filters?: OrderBookFilters
  maxLevels?: number
  pricePrecision?: number
}

/**
 * Hook for fetching and processing market depth data
 * Aggregates order book data by price level and calculates cumulative volumes
 */
export function useMarketDepth({
  filters,
  maxLevels = 30,
  pricePrecision = 8,
}: UseMarketDepthOptions = {}) {
  const {
    orderBookData,
    orderBookLoading,
    orderBookError,
    refreshOrderBook,
  } = useOrderBook(filters)

  // Use the same filtering logic as the order book to get buy/sell orders
  const { filteredBuyOrders, filteredSellOrders, calculatePriceFn } = useOrderBookFiltering(orderBookData, filters)

  // Transform order book data to chart format using filtered orders and correct price calculation
  const orderBookChartData = useMemo(
    () => transformOrderBookForChart(orderBookData, {
      filters,
      buyOrders: filteredBuyOrders,
      sellOrders: filteredSellOrders,
      calculatePriceFn,
    }),
    [orderBookData, filters, filteredBuyOrders, filteredSellOrders, calculatePriceFn]
  )

  // Aggregate by price level
  const depthData = useMemo<MarketDepthData>(() => {
    return aggregateDepthByPriceLevel(orderBookChartData, maxLevels, pricePrecision)
  }, [orderBookChartData, maxLevels, pricePrecision])

  return {
    depthData,
    isLoading: orderBookLoading,
    isError: !!orderBookError,
    error: orderBookError,
    refetch: refreshOrderBook,
  }
}
