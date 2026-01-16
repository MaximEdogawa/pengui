'use client'

import { logger } from '@/shared/lib/logger'
import { useMutation } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import type {
  DexieHistoricalTradesResponse,
  DexieOrderBookResponse,
} from '../../lib/dexieTypes'

/**
 * Hook for Dexie market data operations (order book, historical trades)
 */
export function useDexieMarketData() {
  const { network } = useNetwork()
  const dexieApiBaseUrl = getDexieApiUrl(network)

  const getOrderBookMutation = useMutation({
    mutationFn: async ({
      tickerId,
      depth = 10,
    }: {
      tickerId: string
      depth?: number
    }): Promise<DexieOrderBookResponse> => {
      try {
        const response = await fetch(
          `${dexieApiBaseUrl}/v3/prices/orderbook?ticker_id=${tickerId}&depth=${depth}`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return {
          success: true,
          data: data.data || data,
        }
      } catch (error) {
        logger.error('Failed to fetch order book:', error)
        throw error
      }
    },
    onSuccess: () => {
      logger.info('Order book retrieved successfully')
    },
    onError: (error) => {
      logger.error('Failed to get order book:', error)
    },
  })

  const getHistoricalTradesMutation = useMutation({
    mutationFn: async ({
      tickerId,
      limit = 100,
    }: {
      tickerId: string
      limit?: number
    }): Promise<DexieHistoricalTradesResponse> => {
      try {
        const response = await fetch(
          `${dexieApiBaseUrl}/v3/prices/trades?ticker_id=${tickerId}&limit=${limit}`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return {
          success: true,
          data: data.data || data,
        }
      } catch (error) {
        logger.error('Failed to fetch historical trades:', error)
        throw error
      }
    },
    onSuccess: () => {
      logger.info('Historical trades retrieved successfully')
    },
    onError: (error) => {
      logger.error('Failed to get historical trades:', error)
    },
  })

  return {
    getOrderBook: ({ tickerId, depth }: { tickerId: string; depth?: number }) =>
      getOrderBookMutation.mutateAsync({ tickerId, depth }),
    getHistoricalTrades: ({ tickerId, limit }: { tickerId: string; limit?: number }) =>
      getHistoricalTradesMutation.mutateAsync({ tickerId, limit }),
    getOrderBookMutation,
    getHistoricalTradesMutation,
    isGettingOrderBook: getOrderBookMutation.isPending,
    isGettingTrades: getHistoricalTradesMutation.isPending,
  }
}
