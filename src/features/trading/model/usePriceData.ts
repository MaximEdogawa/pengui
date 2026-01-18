'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { logger } from '@/shared/lib/logger'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { aggregateTradesToOHLC, normalizeOHLCData } from '../lib/utils/chartUtils'
import type { OHLCData, Timeframe } from '../lib/chartTypes'
import type { OrderBookFilters } from '../lib/orderBookTypes'

interface UsePriceDataOptions {
  tickerId: string | null
  timeframe: Timeframe
  filters?: OrderBookFilters
  enabled?: boolean
}

function getLimitForTimeframe(timeframe: Timeframe): number {
  const limits: Record<Timeframe, number> = {
    '1m': 100,
    '5m': 200,
    '15m': 300,
    '1h': 500,
    '4h': 1000,
    '1D': 2000,
    '1W': 3000,
    '1M': 5000,
  }
  return limits[timeframe]
}

function logRawDataStructure(tradesArray: unknown[], queryKey: unknown[], tickerId: string | null) {
  if (tradesArray.length === 0) return
  
  const firstItem = tradesArray[0] as Record<string, unknown> | undefined
  logger.debug('Raw API data structure', {
    arrayLength: tradesArray.length,
    firstItem: firstItem ? {
      keys: Object.keys(firstItem),
      hasTradeTimestamp: 'trade_timestamp' in firstItem,
      hasTimestamp: 'timestamp' in firstItem,
      hasBaseVolume: 'base_volume' in firstItem,
      hasVolume: 'volume' in firstItem,
      hasPrice: 'price' in firstItem,
      sample: firstItem,
    } : null,
    queryKey,
    tickerId,
  })
}

function getCachedPriceData(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  options: { network: string; tickerId: string | null; timeframe: Timeframe; limit: number }
): unknown {
  const { network, tickerId, timeframe, limit } = options
  try {
    // Try current query key format
    let cached = queryClient.getQueryData(queryKey)
    
    // If not found and we have tickerId, try old format with tickerId
    if (!cached && tickerId) {
      const oldKey = ['priceData', network, tickerId, timeframe, limit]
      cached = queryClient.getQueryData(oldKey)
      if (cached) {
        logger.debug('Found cached data with old key format', { oldKey, newKey: queryKey })
      }
    }
    
    // Also try to find any priceData query that might match
    if (!cached) {
      const queryCache = queryClient.getQueryCache()
      const allPriceDataQueries = queryCache.findAll({ queryKey: ['priceData'] })
      logger.debug('All priceData queries in cache', {
        count: allPriceDataQueries.length,
        keys: allPriceDataQueries.map(q => q.queryKey),
        currentKey: queryKey,
      })
      
      // Try to find a matching query by timeframe and network
      const matchingQuery = allPriceDataQueries.find(q => {
        const key = q.queryKey
        return key[1] === network && key[4] === timeframe && key[5] === limit
      })
      
      if (matchingQuery) {
        cached = matchingQuery.state.data
        logger.debug('Found matching cached query', {
          matchedKey: matchingQuery.queryKey,
          currentKey: queryKey,
        })
      }
    }
    
    // Log for debugging
    if (cached) {
      logger.debug('Found cached price data', {
        queryKey,
        hasData: Array.isArray(cached) ? cached.length : 'not array',
        tickerId,
      })
    } else {
      logger.debug('No cached price data found', { queryKey, tickerId })
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
    logger.debug('No data to use for OHLC aggregation', { queryKey, tickerId })
    return []
  }
  
  const tradesArray = Array.isArray(dataToUse) ? dataToUse : []
  if (tradesArray.length === 0) {
    logger.debug('Trades array is empty', { queryKey, tickerId, dataToUse })
    return []
  }

  // Log raw data structure for debugging
  logRawDataStructure(tradesArray, queryKey, tickerId)

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
      logger.debug('Data is already in OHLC format, normalizing', {
        inputLength: tradesArray.length,
        queryKey,
      })
      aggregated = normalizeOHLCData(tradesArray)
    } else {
      // Data is in trade format, aggregate it
      aggregated = aggregateTradesToOHLC(tradesArray, timeframe)
    }

    logger.info('Price data aggregation successful', {
      inputTrades: tradesArray.length,
      outputOHLC: aggregated.length,
      timeframe,
      queryKey,
      wasAlreadyOHLC: isAlreadyOHLC,
      firstCandle: aggregated[0] ? {
        time: aggregated[0].time,
        timeType: typeof aggregated[0].time,
        open: aggregated[0].open,
        high: aggregated[0].high,
        low: aggregated[0].low,
        close: aggregated[0].close,
        volume: aggregated[0].volume,
      } : null,
      lastCandle: aggregated.length > 0 ? {
        time: aggregated[aggregated.length - 1].time,
        open: aggregated[aggregated.length - 1].open,
        high: aggregated[aggregated.length - 1].high,
        low: aggregated[aggregated.length - 1].low,
        close: aggregated[aggregated.length - 1].close,
        volume: aggregated[aggregated.length - 1].volume,
      } : null,
    })
    
    if (aggregated.length === 0) {
      logger.warn('Aggregation returned empty array', {
        inputTrades: tradesArray.length,
        firstTrade: tradesArray[0],
        timeframe,
      })
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

export function usePriceData({ tickerId, timeframe, filters, enabled = true }: UsePriceDataOptions) {
  const { network } = useNetwork()
  const queryClient = useQueryClient()
  const dexieDataService = useDexieDataService()
  const limit = getLimitForTimeframe(timeframe)

  // Create query key similar to order book queries, including ticker information
  // Uses buyKey/sellKey (human-readable) instead of tickerId for better DevTools visibility
  const queryKey = useMemo(() => {
    const buyAssets = filters?.buyAsset || []
    const sellAssets = filters?.sellAsset || []
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')
    
    // Always use buyKey/sellKey structure (even if empty) for consistency with order book
    // tickerId is still used in queryFn for the API call, but not in the cache key
    return ['priceData', network, buyKey, sellKey, timeframe, limit]
  }, [network, filters?.buyAsset, filters?.sellAsset, timeframe, limit])

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

      return parseTradesData(response.data)
    },
    enabled: enabled && !!tickerId,
    // Use cached data as initial data if available
    initialData: cachedData as unknown[] | undefined,
    // Allow using cached data even when query is disabled
    placeholderData: (previousData) => (previousData ?? cachedData) as unknown[] | undefined,
    // Ensure we can use stale data
    gcTime: Infinity, // Keep data in cache indefinitely
    staleTime: timeframe === '1m' ? 10 * 1000 : timeframe === '5m' ? 30 * 1000 : 60 * 1000,
    refetchInterval: enabled && !!tickerId ? (timeframe === '1m' ? 10 * 1000 : timeframe === '5m' ? 30 * 1000 : 60 * 1000) : false,
    retry: 2,
  })

  // Use query.data if available, otherwise fall back to cachedData
  // TanStack Query should return cached data in query.data even when disabled, but we have a fallback
  const dataToUse = query.data ?? cachedData ?? undefined

  // Log data state for debugging
  useMemo(() => {
    logger.debug('Price data state', {
      hasQueryData: !!query.data,
      hasCachedData: !!cachedData,
      dataToUse: dataToUse ? (Array.isArray(dataToUse) ? dataToUse.length : 'not array') : null,
      queryEnabled: enabled && !!tickerId,
      tickerId,
      queryKey,
      queryStatus: {
        isLoading: query.isLoading,
        isError: query.isError,
        isSuccess: query.isSuccess,
        status: query.status,
      },
    })
  }, [query.data, cachedData, dataToUse, enabled, tickerId, queryKey, query.isLoading, query.isError, query.isSuccess, query.status])

  const ohlcData = useMemo<OHLCData[]>(
    () => processOHLCData(dataToUse, timeframe, queryKey, tickerId),
    [dataToUse, timeframe, queryKey, tickerId]
  )

  // Check if we have cached data available (even if query is disabled)
  // This helps prevent falling back to synthetic data when real data exists in cache
  const hasCachedData = !!(dataToUse && Array.isArray(dataToUse) && dataToUse.length > 0)
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
