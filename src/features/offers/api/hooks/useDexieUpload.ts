'use client'

import { logger } from '@/shared/lib/logger'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import type { DexiePostOfferParams, DexiePostOfferResponse } from '../../lib/dexieTypes'

const DEXIE_KEY = 'dexie'

/**
 * Hook for Dexie upload operations (post offer)
 */
export function useDexieUpload() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()
  const dexieApiBaseUrl = getDexieApiUrl(network)

  const postOfferMutation = useMutation({
    mutationFn: async (params: DexiePostOfferParams): Promise<DexiePostOfferResponse> => {
      try {
        const response = await fetch(`${dexieApiBaseUrl}/v1/offers`, {
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

  return {
    postOffer: postOfferMutation.mutateAsync,
    postOfferMutation,
    isPosting: postOfferMutation.isPending,
  }
}
