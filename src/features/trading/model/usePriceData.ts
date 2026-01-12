'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { aggregateTradesToOHLC } from '../lib/utils/chartUtils'
import type { OHLCData, Timeframe } from '../lib/chartTypes'

interface UsePriceDataOptions {
  tickerId: string | null
  timeframe: Timeframe
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

export function usePriceData({ tickerId, timeframe, enabled = true }: UsePriceDataOptions) {
  const dexieDataService = useDexieDataService()
  const limit = getLimitForTimeframe(timeframe)

  const query = useQuery({
    queryKey: ['priceData', tickerId, timeframe, limit],
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
    enabled: enabled && !!tickerId,
    staleTime: timeframe === '1m' ? 10 * 1000 : timeframe === '5m' ? 30 * 1000 : 60 * 1000,
    refetchInterval: timeframe === '1m' ? 10 * 1000 : timeframe === '5m' ? 30 * 1000 : 60 * 1000,
    retry: 2,
  })

  const ohlcData = useMemo<OHLCData[]>(() => {
    if (!query.data) return []
    const tradesArray = Array.isArray(query.data) ? query.data : []
    if (tradesArray.length === 0) return []

    try {
      return aggregateTradesToOHLC(tradesArray, timeframe)
    } catch {
      return []
    }
  }, [query.data, timeframe])

  return {
    ohlcData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
