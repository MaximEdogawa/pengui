'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { logger } from '@/shared/lib/logger'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { aggregateTradesToOHLC, normalizeOHLCData } from '../lib/utils/chartUtils'
import type { OHLCData, Timeframe } from '../lib/chartTypes'
import type { OrderBookFilters } from '../lib/orderBookTypes'
import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'

interface UsePriceDataOptions {
  tickerId: string | null
  timeframe: Timeframe
  filters?: OrderBookFilters
  enabled?: boolean
  isUserScrolling?: boolean // Prevent refetch when user is scrolling
}

function getLimitForTimeframe(timeframe: Timeframe): number {
  // Increased limits to fetch maximum available historical data
  // The API should handle these limits, but we request as much as possible
  const limits: Record<Timeframe, number> = {
    '1m': 10000,   // Increased significantly for detailed minute data
    '15m': 10000,  // Increased for 15-minute candles
    '1h': 10000,   // Increased for hourly candles
    '4h': 10000,   // Increased for 4-hour candles
    '1D': 50000,   // Maximum for daily candles - fetch all available historical data
    '1W': 50000,   // Maximum for weekly candles
    '1M': 50000,   // Maximum for monthly candles
  }
  return limits[timeframe]
}


function getCachedPriceData(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  options: { network: string; tickerId: string | null; timeframe: Timeframe; limit: number }
): unknown {
  const { network, tickerId, timeframe } = options
  try {
    // Try current query key format (without limit)
    let cached = queryClient.getQueryData(queryKey)
    
    // If not found and we have tickerId, try old format with tickerId (with or without limit)
    if (!cached && tickerId) {
      // Try old format without limit
      const oldKey = ['priceData', network, tickerId, timeframe]
      cached = queryClient.getQueryData(oldKey)
      
      // Also try old format with limit for backward compatibility
      if (!cached) {
        const oldKeyWithLimit = ['priceData', network, tickerId, timeframe, options.limit]
        cached = queryClient.getQueryData(oldKeyWithLimit)
      }
    }
    
    return cached
  } catch (error) {
    logger.error('Error accessing cached data', { error, queryKey })
    return undefined
  }
}

function parseTradesData(tradesData: unknown): unknown[] {
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
}

function processOHLCData(
  dataToUse: unknown,
  timeframe: Timeframe,
  queryKey: unknown[],
  tickerId: string | null
): OHLCData[] {
  if (!dataToUse) {
    return []
  }
  
  // Use parseTradesData to handle legacy cache shapes like { trades: [...] } or { data: [...] }
  const tradesArray = parseTradesData(dataToUse)
  if (tradesArray.length === 0) {
    return []
  }

  try {
    // Check if data is already in OHLC format (from cache or previous aggregation)
    const firstItem = tradesArray[0]
    const isAlreadyOHLC = 
      firstItem &&
      typeof firstItem === 'object' &&
      'time' in firstItem &&
      'open' in firstItem &&
      'high' in firstItem &&
      'low' in firstItem &&
      'close' in firstItem &&
      'volume' in firstItem

    let aggregated: OHLCData[]
    
    if (isAlreadyOHLC) {
      // Data is already in OHLC format, normalize it
      aggregated = normalizeOHLCData(tradesArray)
    } else {
      // Data is in trade format, aggregate it
      // Cast to DexieHistoricalTrade[] since parseTradesData extracts trade arrays
      aggregated = aggregateTradesToOHLC(tradesArray as unknown as DexieHistoricalTrade[], timeframe)
    }

    
    return aggregated
  } catch (error) {
    logger.error('Failed to aggregate trades to OHLC', {
      error,
      dataToUse,
      timeframe,
      queryKey,
    })
    return []
  }
}

export function usePriceData({ tickerId, timeframe, filters, enabled = true, isUserScrolling = false }: UsePriceDataOptions) {
  const { network } = useNetwork()
  const queryClient = useQueryClient()
  const dexieDataService = useDexieDataService()
  const limit = getLimitForTimeframe(timeframe)

  // Create query key similar to order book queries, including ticker information
  // Uses buyKey/sellKey (human-readable) instead of tickerId for better DevTools visibility
  // Limit and timeframe are not included in the query key - they're only used in the API call
  // Includes tickerId fallback to prevent cache collisions when filters are missing
  const queryKey = useMemo(() => {
    const buyAssets = filters?.buyAsset || []
    const sellAssets = filters?.sellAsset || []
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')
    const tickerIdFallback = tickerId || ''
    
    // Always use buyKey/sellKey structure (even if empty) for consistency with order book
    // tickerId fallback prevents cache collisions when filters are missing
    // tickerId, limit, and timeframe are still used in queryFn for the API call, but not in the cache key
    return ['priceData', network, buyKey, sellKey, tickerIdFallback]
  }, [network, filters?.buyAsset, filters?.sellAsset, tickerId])

  // Try to get cached data directly from query client, even if query is disabled
  // Also check for data with old query key format (with tickerId) for backward compatibility
  const cachedData = useMemo(
    () => getCachedPriceData(queryClient, queryKey, { network, tickerId, timeframe, limit }),
    [queryClient, queryKey, network, tickerId, timeframe, limit]
  )

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tickerId) {
        throw new Error('Ticker ID is required')
      }

      const response = await dexieDataService.getHistoricalTrades({
        tickerId,
        limit,
      })

      if (!response.success) {
        throw new Error('Failed to fetch historical trades')
      }

      const parsedData = parseTradesData(response.data)
      
      logger.info('Historical trades fetched', {
        tickerId,
        requestedLimit: limit,
        receivedTrades: parsedData.length,
        timeframe,
      })
      
      return parsedData
    },
    enabled: enabled && !!tickerId,
    // Use cached data as initial data if available
    initialData: cachedData as unknown[] | undefined,
    // Allow using cached data even when query is disabled
    placeholderData: (previousData) => (previousData ?? cachedData) as unknown[] | undefined,
    // Ensure we can use stale data
    gcTime: Infinity, // Keep data in cache indefinitely
    staleTime: timeframe === '1m' ? 10 * 1000 : 60 * 1000,
    // Refetch when query key changes (e.g., when filters change)
    refetchOnMount: true,
    // Only auto-refetch for short timeframes when enabled and user is not scrolling
    // Longer timeframes (1D, 1W, 1M) don't need frequent updates
    refetchInterval: enabled && !!tickerId && !isUserScrolling && (timeframe === '1m' || timeframe === '15m' || timeframe === '1h')
      ? (timeframe === '1m' ? 10 * 1000 : 60 * 1000)
      : false,
    // Don't refetch on window focus for longer timeframes or when scrolling
    refetchOnWindowFocus: !isUserScrolling && (timeframe === '1m' || timeframe === '15m' || timeframe === '1h'),
    retry: 2,
  })

  // Note: No need for useEffect to refetch on filter changes
  // TanStack Query automatically refetches when the query key changes
  // Since the query key includes filters (buyKey, sellKey), changing filters
  // will automatically trigger a new query and fetch

  // Use query.data if available, otherwise fall back to cachedData
  // TanStack Query should return cached data in query.data even when disabled, but we have a fallback
  const dataToUse = query.data ?? cachedData ?? undefined


  const ohlcData = useMemo<OHLCData[]>(
    () => processOHLCData(dataToUse, timeframe, queryKey, tickerId),
    [dataToUse, timeframe, queryKey, tickerId]
  )

  // Check if we have cached data available (even if query is disabled)
  // This helps prevent falling back to synthetic data when real data exists in cache
  // Use parseTradesData to handle legacy cache shapes
  const parsedData = dataToUse ? parseTradesData(dataToUse) : []
  const hasCachedData = parsedData.length > 0
  const isSuccess = query.isSuccess || (!!dataToUse && !query.isError)

  return {
    ohlcData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasCachedData,
    isSuccess,
    rawData: dataToUse,
  }
}
