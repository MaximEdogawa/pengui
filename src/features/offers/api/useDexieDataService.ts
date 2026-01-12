'use client'

import { environment } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DexieHistoricalTradesResponse,
  DexieOfferSearchParams,
  DexieOfferSearchResponse,
  DexieOrderBookResponse,
  DexiePairsResponse,
  DexiePostOfferParams,
  DexiePostOfferResponse,
} from '../lib/dexieTypes'

const DEXIE_KEY = 'dexie'
const PAIRS_KEY = 'pairs'
const DEXIE_API_BASE_URL = environment.dexie.apiBaseUrl

export function useDexieDataService() {
  const queryClient = useQueryClient()

  const pairsQuery = useQuery({
    queryKey: [DEXIE_KEY, PAIRS_KEY],
    queryFn: async (): Promise<DexiePairsResponse> => {
      try {
        const response = await fetch(`${DEXIE_API_BASE_URL}/v3/prices/pairs`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return {
          success: true,
          data: data.data || data,
        }
      } catch (error) {
        logger.error('Failed to fetch all pairs:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })

  const searchOffersMutation = useMutation({
    mutationFn: async (params: DexieOfferSearchParams = {}): Promise<DexieOfferSearchResponse> => {
      try {
        const queryParams = new URLSearchParams()

        if (params.requested) queryParams.append('requested', params.requested)
        if (params.offered) queryParams.append('offered', params.offered)
        if (params.maker) queryParams.append('maker', params.maker)
        if (params.page_size) queryParams.append('page_size', params.page_size.toString())
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.status !== undefined) queryParams.append('status', params.status.toString())

        const response = await fetch(`${DEXIE_API_BASE_URL}/v1/offers?${queryParams.toString()}`)

        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = `HTTP error! status: ${response.status}`
          // Read body as text first (can only be read once)
          const responseText = await response.text()

          if (responseText) {
            try {
              // Try to parse as JSON to extract structured error data
              const errorData = JSON.parse(responseText)
              if (errorData.message || errorData.error) {
                errorMessage = `${errorMessage}: ${errorData.message || errorData.error}`
              } else {
                errorMessage = `${errorMessage}: ${responseText}`
              }
            } catch {
              // If parsing fails, use the raw text as error message
              errorMessage = `${errorMessage}: ${responseText}`
            }
          }

          logger.error('Dexie API error:', {
            status: response.status,
            url: `${DEXIE_API_BASE_URL}/v1/offers?${queryParams.toString()}`,
            error: errorMessage,
          })
          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Handle different response structures
        let offersData: unknown[] = []
        if (Array.isArray(data)) {
          offersData = data
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.data)) {
            offersData = data.data
          } else if (Array.isArray(data.offers)) {
            offersData = data.offers
          } else if (Array.isArray(data.results)) {
            offersData = data.results
          }
        }

        return {
          success: true,
          data: offersData,
          total: data.total || offersData.length,
          page: data.page || 1,
          page_size: data.page_size || 10,
        }
      } catch (error) {
        logger.error('Failed to search offers:', error)
        throw error
      }
    },
    onSuccess: () => {
      logger.info('Offers searched successfully')
    },
    onError: (error) => {
      logger.error('Failed to search offers:', error)
    },
  })

  const inspectOfferMutation = useMutation({
    mutationFn: async (dexieId: string): Promise<DexiePostOfferResponse> => {
      try {
        logger.info(`Fetching offer by ID: ${dexieId}`)
        const response = await fetch(`${DEXIE_API_BASE_URL}/v1/offers/${dexieId}`)

        const result = await response.json()
        logger.info(`Response status: ${response.status}, Result:`, result)

        if (!response.ok) {
          logger.warn(`Offer not found or expired for ID ${dexieId}:`, result)
          return {
            success: false,
            id: dexieId,
            known: false,
            offer: null,
            error_message: result.error_message || `HTTP error! status: ${response.status}`,
          }
        }

        const responseData = {
          success: result.success,
          id: result.offer?.id || dexieId,
          known: true,
          offer: result.offer,
        }
        logger.info(`Returning successful response:`, responseData)
        return responseData
      } catch (error) {
        logger.error('Failed to fetch offer by ID:', error)
        throw error
      }
    },
    gcTime: 0, // Don't cache mutations
    onSuccess: (data) => {
      logger.info('Offer inspected successfully:', data)
      if (data.success && data.id) {
        queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, 'offers'] })
      }
    },
    onError: (error) => {
      logger.error('Failed to inspect offer:', error)
    },
  })

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
          `${DEXIE_API_BASE_URL}/v3/prices/orderbook?ticker_id=${tickerId}&depth=${depth}`
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
          `${DEXIE_API_BASE_URL}/v3/prices/trades?ticker_id=${tickerId}&limit=${limit}`
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

  const postOfferMutation = useMutation({
    mutationFn: async (params: DexiePostOfferParams): Promise<DexiePostOfferResponse> => {
      try {
        const response = await fetch(`${DEXIE_API_BASE_URL}/v1/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Dexie API error: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        return {
          success: data.success,
          id: data.id,
          known: data.known,
          offer: data.offer,
        }
      } catch (error) {
        logger.error('Failed to post offer:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      logger.info('Offer posted successfully:', data)
      // Invalidate offers queries to refresh the list
      queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, 'offers'] })
    },
    onError: (error) => {
      logger.error('Failed to post offer:', error)
    },
  })

  const inspectOfferWithPolling = async (dexieId: string, maxAttempts: number = 30) => {
    if (!dexieId) throw new Error('Dexie ID is required for polling')

    let attempts = 0

    const pollOfferStatus = async (): Promise<DexiePostOfferResponse> => {
      const result = await inspectOfferMutation.mutateAsync(dexieId)
      const finalStates = [3, 4, 6] // Complete states
      if (result.offer && finalStates.includes(result.offer.status)) {
        return result
      }

      attempts++
      if (attempts >= maxAttempts) {
        logger.warn(`Offer polling timed out after ${maxAttempts} attempts`)
        return result
      }

      await new Promise((resolve) => setTimeout(resolve, 20000))
      return pollOfferStatus()
    }

    return await pollOfferStatus()
  }

  const refreshPairs = async () => {
    await queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, PAIRS_KEY] })
  }

  const refreshOffers = async () => {
    await queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, 'offers'] })
  }

  const validateOfferString = (offerString: string): boolean => {
    if (!offerString || offerString.trim().length === 0) {
      return false
    }

    const cleanOffer = offerString.trim()
    if (cleanOffer.length < 50) {
      return false
    }

    const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanOffer)
    const startsWithOffer = cleanOffer.startsWith('offer')

    return isBase64 || startsWithOffer
  }

  const isLoading =
    searchOffersMutation.isPending ||
    inspectOfferMutation.isPending ||
    getOrderBookMutation.isPending ||
    getHistoricalTradesMutation.isPending ||
    postOfferMutation.isPending

  return {
    pairsQuery,
    searchOffers: searchOffersMutation.mutateAsync,
    inspectOffer: async (dexieId: string) => {
      return await inspectOfferMutation.mutateAsync(dexieId)
    },
    getOrderBook: ({ tickerId, depth }: { tickerId: string; depth?: number }) =>
      getOrderBookMutation.mutateAsync({ tickerId, depth }),
    getHistoricalTrades: ({ tickerId, limit }: { tickerId: string; limit?: number }) =>
      getHistoricalTradesMutation.mutateAsync({ tickerId, limit }),
    inspectOfferWithPolling,
    postOffer: postOfferMutation.mutateAsync,
    refreshPairs,
    refreshOffers,
    validateOfferString,
    searchOffersMutation,
    inspectOfferMutation,
    getOrderBookMutation,
    getHistoricalTradesMutation,
    postOfferMutation,

    offers: [],
    currentOffer: null,
    isLoading,
    error: null,
    isSearching: searchOffersMutation.isPending,
    isInspecting: inspectOfferMutation.isPending,
    isPosting: postOfferMutation.isPending,
    isGettingOrderBook: getOrderBookMutation.isPending,
    isGettingTrades: getHistoricalTradesMutation.isPending,
  }
}
