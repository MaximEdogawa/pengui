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
      try {
        const queryParams = buildOfferSearchParams(params)
        const url = `${dexieApiBaseUrl}/v1/offers?${queryParams.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
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

  return {
    pairsQuery,
    searchOffers: searchOffersMutation.mutateAsync,
    searchOffersMutation,
    isSearching: searchOffersMutation.isPending,
  }
}
