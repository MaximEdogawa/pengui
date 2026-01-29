'use client'

import type { OfferDetails } from '@/entities/offer'
import { useCancelOffer } from '@/features/wallet'
import { useCallback } from 'react'
import { useMyOffersBulkActions } from './useMyOffersBulkActions'
import { UseMyOffersSetters, UseMyOffersState } from './useMyOffersState'
import { useOfferStorage } from './useOfferStorage'
import { useMyOffersSingleActions } from './useMyOffersSingleActions'
import { createOfferCreatedEvent } from './useMyOffersHandlers'

interface UseMyOffersActionsProps {
  state: UseMyOffersState & UseMyOffersSetters
  refreshOffers: () => Promise<void>
}

/**
 * Hook for managing offer actions (cancel, delete, update, etc.)
 */
export function useMyOffersActions({ state, refreshOffers }: UseMyOffersActionsProps) {
  const cancelOfferMutation = useCancelOffer()
  const offerStorage = useOfferStorage()

  const singleActions = useMyOffersSingleActions({
    state,
    refreshOffers,
    cancelOfferMutation,
    offerStorage,
  })

  const bulkActions = useMyOffersBulkActions({
    state,
    refreshOffers,
    cancelOfferMutation,
    offerStorage,
  })

  const handleOfferCreated = useCallback(
    async (offer: OfferDetails) => {
      await refreshOffers()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(createOfferCreatedEvent(offer))
      }
    },
    [refreshOffers]
  )

  return {
    ...singleActions,
    ...bulkActions,
    handleOfferCreated,
  }
}
