'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'

const DEXIE_KEY = 'dexie'
const PAIRS_KEY = 'pairs'

/**
 * Hook for Dexie utility functions (validation, refresh)
 */
export function useDexieUtils() {
  const queryClient = useQueryClient()
  const { network } = useNetwork()

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

  const refreshPairs = async () => {
    await queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, PAIRS_KEY, network] })
  }

  const refreshOffers = async () => {
    await queryClient.invalidateQueries({ queryKey: [DEXIE_KEY, 'offers', network] })
  }

  return {
    validateOfferString,
    refreshPairs,
    refreshOffers,
  }
}
