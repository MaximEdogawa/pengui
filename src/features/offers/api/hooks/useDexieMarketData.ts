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
        const url = `${dexieApiBaseUrl}/v3/prices/orderbook?ticker_id=${tickerId}&depth=${depth}`
        const response = await fetch(url)

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `HTTP error! status: ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.message || errorData.error) {
              errorMessage = `${errorMessage}: ${errorData.message || errorData.error}`
            } else {
              errorMessage = `${errorMessage}: ${errorText}`
            }
          } catch {
            errorMessage = `${errorMessage}: ${errorText}`
          }

          logger.error('Order book API error', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            tickerId,
            network,
            url,
          })
          throw new Error(errorMessage)
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
        const url = `${dexieApiBaseUrl}/v3/prices/historical_trades?ticker_id=${tickerId}&limit=${limit}`
        logger.info('Fetching historical trades', { url, tickerId, limit, network })
        
        const response = await fetch(url)

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `HTTP error! status: ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.message || errorData.error) {
              errorMessage = `${errorMessage}: ${errorData.message || errorData.error}`
            } else {
              errorMessage = `${errorMessage}: ${errorText}`
            }
          } catch {
            errorMessage = `${errorMessage}: ${errorText}`
          }

          logger.error('Historical trades API error', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            tickerId,
            network,
            url,
          })
          throw new Error(errorMessage)
        }

        const data = await response.json()
        
        logger.info('Historical trades API response', {
          tickerId,
          network,
          hasData: !!data,
          dataType: typeof data,
          isArray: Array.isArray(data),
          hasTrades: !!(data && typeof data === 'object' && 'trades' in data),
          hasDataField: !!(data && typeof data === 'object' && 'data' in data),
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
          sampleData: Array.isArray(data) && data.length > 0 ? data[0] : (data && typeof data === 'object' ? data : null),
        })
        
        // Handle different response structures
        let tradesData: unknown = data
        
        // If response has a 'data' field, use it
        if (data && typeof data === 'object' && 'data' in data) {
          tradesData = (data as { data: unknown }).data
        }
        // If response has a 'trades' field, use it
        else if (data && typeof data === 'object' && 'trades' in data) {
          tradesData = (data as { trades: unknown }).trades
        }
        // Otherwise use the data as-is
        
        // Ensure tradesData is an array for type safety
        const tradesArray = Array.isArray(tradesData) 
          ? tradesData 
          : (tradesData && typeof tradesData === 'object' && 'trades' in tradesData && Array.isArray((tradesData as { trades: unknown }).trades))
            ? (tradesData as { trades: unknown[] }).trades
            : []
        
        return {
          success: true,
          data: tradesArray,
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
