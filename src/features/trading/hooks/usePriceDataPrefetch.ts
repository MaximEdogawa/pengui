'use client'

import { useTickers } from '@/entities/asset'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { resolveTickerId } from '../lib/tickerResolution'
import { logger } from '@/shared/lib/logger'
import type { OrderBookFilters } from '../lib/orderBookTypes'
import type { Timeframe } from '../lib/chartTypes'

// Prefetch these timeframes when filters change
const PREFETCH_TIMEFRAMES: Timeframe[] = ['1h', '4h', '1D']

function getLimitForTimeframe(timeframe: Timeframe): number {
  // Match the limits in usePriceData to ensure consistent prefetching
  const limits: Record<Timeframe, number> = {
    '1m': 10000,
    '15m': 10000,
    '1h': 10000,
    '4h': 10000,
    '1D': 50000,
    '1W': 50000,
    '1M': 50000,
  }
  return limits[timeframe]
}

/**
 * Hook to prefetch price data when filters change
 * This ensures price data is cached before switching to the chart tab
 */
export function usePriceDataPrefetch(filters?: OrderBookFilters) {
  const { network } = useNetwork()
  const queryClient = useQueryClient()
  const dexieDataService = useDexieDataService()
  const { data: tickersData, isLoading: isLoadingTickers } = useTickers()
  const tickers = useMemo(() => tickersData?.data || [], [tickersData?.data])

  // Resolve tickerId from filters
  const tickerId = useMemo(() => {
    if (!filters || tickers.length === 0 || isLoadingTickers) return null
    return resolveTickerId(filters, tickers)
  }, [filters, tickers, isLoadingTickers])

  // Prefetch price data when filters change and tickerId is available
  useEffect(() => {
    if (!tickerId || !filters) return

    // Create query key base matching usePriceData structure
    const buyAssets = filters.buyAsset || []
    const sellAssets = filters.sellAsset || []
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')

    // Prefetch once with max limit to warm cache for all timeframes
    // Use the same query key structure as usePriceData (without timeframe) so prefetched data is reused
    const maxLimit = Math.max(...PREFETCH_TIMEFRAMES.map(tf => getLimitForTimeframe(tf)))
    const tickerIdFallback = tickerId || ''
    // Limit is not included in query key - it's only used in the API call
    // Query key matches usePriceData structure: ['priceData', network, buyKey, sellKey, tickerIdFallback]
    const queryKey = ['priceData', network, buyKey, sellKey, tickerIdFallback]

    // Check if data is already cached
    const cachedData = queryClient.getQueryData(queryKey)
    if (cachedData) {
      return
    }
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const response = await dexieDataService.getHistoricalTrades({
          tickerId,
          limit: maxLimit,
        })

        if (!response.success) {
          throw new Error('Failed to fetch historical trades')
        }

        const tradesData = response.data
        if (!tradesData) return []

        if (Array.isArray(tradesData)) {
          return tradesData
        }

        if (typeof tradesData === 'object' && tradesData !== null && 'trades' in tradesData) {
          const nestedTrades = (tradesData as { trades: unknown }).trades
          if (Array.isArray(nestedTrades)) {
            return nestedTrades
          }
        }

        if (typeof tradesData === 'object' && tradesData !== null && 'data' in tradesData) {
          const nestedData = (tradesData as { data: unknown }).data
          if (Array.isArray(nestedData)) {
            return nestedData
          }
        }

        return []
      },
      staleTime: 60 * 1000, // 1 minute
    }).catch((error) => {
      logger.error('Failed to prefetch price data', { error, queryKey, tickerId })
    })
  }, [tickerId, filters, network, queryClient, dexieDataService])
}
