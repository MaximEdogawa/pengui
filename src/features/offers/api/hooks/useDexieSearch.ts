'use client'

import { logger } from '@/shared/lib/logger'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import {
  buildOfferSearchParams,
  extractErrorMessage,
  parseOffersData,
  logApiError,
} from '../dexieApiHelpers'
import type {
  DexieOfferSearchParams,
  DexieOfferSearchResponse,
  DexiePairsResponse,
} from '../../lib/dexieTypes'

const DEXIE_KEY = 'dexie'
const PAIRS_KEY = 'pairs'

/**
 * Hook for Dexie search operations (search offers, get pairs)
 */
export function useDexieSearch() {
  const { network } = useNetwork()
  const dexieApiBaseUrl = getDexieApiUrl(network)

  const pairsQuery = useQuery({
    queryKey: [DEXIE_KEY, PAIRS_KEY, network],
    queryFn: async (): Promise<DexiePairsResponse> => {
      try {
        const response = await fetch(`${dexieApiBaseUrl}/v3/prices/pairs`)

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
      const queryParams = buildOfferSearchParams(params)
      const url = `${dexieApiBaseUrl}/v1/offers?${queryParams.toString()}`
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      let response: Response
      try {
        response = await fetch(url, { signal: controller.signal })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout: The request took too long to complete')
        }
        // Handle network errors (connection issues, CORS, etc.)
        if (fetchError instanceof TypeError) {
          throw new Error(`Network error: ${fetchError.message}`)
        }
        throw fetchError
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          const errorMessage = 'Rate limit exceeded. Please try again later.'
          logApiError('searchOffers', url, response.status, errorMessage)
          throw new Error(errorMessage)
        }
        
        const errorMessage = await extractErrorMessage(response)
        logApiError('searchOffers', url, response.status, errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const parsed = parseOffersData(data)

      return {
        success: true,
        data: parsed.offers,
        total: parsed.total,
        page: parsed.page,
        page_size: parsed.page_size,
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors (429) - wait for user action
      if (error instanceof Error && error.message.includes('Rate limit')) {
        return false
      }
      // Retry up to 2 times for other errors with exponential backoff
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff, max 5s
    onSuccess: () => {
      logger.info('Offers searched successfully')
    },
    onError: (error) => {
      // Only log if it's not a rate limit error (to avoid spam)
      if (!(error instanceof Error && error.message.includes('Rate limit'))) {
        logger.error('Failed to search offers:', error)
      }
    },
  })

  return {
    pairsQuery,
    searchOffers: searchOffersMutation.mutateAsync,
    searchOffersMutation,
    isSearching: searchOffersMutation.isPending,
  }
}
