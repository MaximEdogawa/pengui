'use client'

import { logger } from '@/shared/lib/logger'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import type { DexiePostOfferResponse } from '../../lib/dexieTypes'

const DEXIE_KEY = 'dexie'

/**
 * Hook for Dexie inspect operations
 */
export function useDexieInspect() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()
  const dexieApiBaseUrl = getDexieApiUrl(network)

  const inspectOfferMutation = useMutation({
    mutationFn: async (dexieId: string): Promise<DexiePostOfferResponse> => {
      try {
        logger.info(`Fetching offer by ID: ${dexieId}`)
        const response = await fetch(`${dexieApiBaseUrl}/v1/offers/${dexieId}`)

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

  return {
    inspectOffer: async (dexieId: string) => {
      return await inspectOfferMutation.mutateAsync(dexieId)
    },
    inspectOfferWithPolling,
    inspectOfferMutation,
    isInspecting: inspectOfferMutation.isPending,
  }
}
