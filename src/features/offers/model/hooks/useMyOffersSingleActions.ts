'use client'

import type { OfferDetails } from '@/entities/offer'
import { useCallback } from 'react'
import { useOfferStorage } from '../useOfferStorage'
import { useCancelOffer } from '@/features/wallet'
import {
  updateOfferStatus,
  removeOfferFromState,
  updateOfferInState,
} from '../useMyOffersHandlers'
import type { UseMyOffersState, UseMyOffersSetters } from '../useMyOffersState'

interface UseMyOffersSingleActionsProps {
  state: UseMyOffersState & UseMyOffersSetters
  refreshOffers: () => Promise<void>
  cancelOfferMutation: ReturnType<typeof useCancelOffer>
  offerStorage: ReturnType<typeof useOfferStorage>
}

export function useMyOffersSingleActions({
  state,
  refreshOffers,
  cancelOfferMutation,
  offerStorage,
}: UseMyOffersSingleActionsProps) {
  const viewOffer = useCallback(
    (offer: OfferDetails | null) => {
      state.setSelectedOffer(offer)
    },
    [state]
  )

  const cancelOffer = useCallback(
    (offer: OfferDetails) => {
      state.setOfferToCancel(offer)
      state.setCancelError('')
      state.setShowCancelConfirmation(true)
    },
    [state]
  )

  const confirmCancelOffer = useCallback(async () => {
    if (!state.offerToCancel) return

    state.setIsCancelling(true)
    state.setCancelError('')

    try {
      await cancelOfferMutation.mutateAsync({
        id: state.offerToCancel.tradeId,
        fee: state.offerToCancel.fee,
      })
      await offerStorage.updateOffer(state.offerToCancel.id, { status: 'cancelled' })
      state.setShowCancelConfirmation(false)
      state.setOfferToCancel(null)
      await refreshOffers()
    } catch (error) {
      state.setCancelError(
        `Failed to cancel offer: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsCancelling(false)
    }
  }, [state, cancelOfferMutation, offerStorage, refreshOffers])

  const handleCancelDialogClose = useCallback(() => {
    state.setShowCancelConfirmation(false)
    state.setOfferToCancel(null)
    state.setCancelError('')
  }, [state])

  const handleOfferTaken = useCallback(
    async (offer: OfferDetails) => {
      state.setOffers((prev) => updateOfferStatus(prev, offer.id, 'completed'))
      await refreshOffers()
    },
    [refreshOffers, state]
  )

  const handleOfferCancelled = useCallback(
    async (offer: OfferDetails) => {
      state.setOffers((prev) => updateOfferStatus(prev, offer.id, 'cancelled'))
      if (state.selectedOffer && state.selectedOffer.id === offer.id) {
        state.setSelectedOffer(null)
      }
      await refreshOffers()
    },
    [refreshOffers, state]
  )

  const handleOfferDeleted = useCallback(
    async (offer: OfferDetails) => {
      state.setOffers((prev) => removeOfferFromState(prev, offer.id))
      if (state.selectedOffer && state.selectedOffer.id === offer.id) {
        state.setSelectedOffer(null)
      }
      await refreshOffers()
    },
    [refreshOffers, state]
  )

  const handleOfferUpdated = useCallback(
    async (offer: OfferDetails) => {
      state.setOffers((prev) => updateOfferInState(prev, offer))
      state.setSelectedOffer((prev) => (prev && prev.id === offer.id ? { ...prev, ...offer } : prev))
      await refreshOffers()
    },
    [refreshOffers, state]
  )

  return {
    viewOffer,
    cancelOffer,
    confirmCancelOffer,
    handleCancelDialogClose,
    handleOfferTaken,
    handleOfferCancelled,
    handleOfferDeleted,
    handleOfferUpdated,
  }
}
