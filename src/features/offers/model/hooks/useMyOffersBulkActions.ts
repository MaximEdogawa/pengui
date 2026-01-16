'use client'

import { useCallback } from 'react'
import { useOfferStorage } from '../useOfferStorage'
import { useCancelOffer } from '@/features/wallet'
import { cancelAllActiveOffers } from '../useMyOffersHandlers'
import type { UseMyOffersState, UseMyOffersSetters } from '../useMyOffersState'

interface UseMyOffersBulkActionsProps {
  state: UseMyOffersState & UseMyOffersSetters
  refreshOffers: () => Promise<void>
  cancelOfferMutation: ReturnType<typeof useCancelOffer>
  offerStorage: ReturnType<typeof useOfferStorage>
}

export function useMyOffersBulkActions({
  state,
  refreshOffers,
  cancelOfferMutation,
  offerStorage,
}: UseMyOffersBulkActionsProps) {
  const cancelAllOffers = useCallback(() => {
    state.setShowCancelAllConfirmation(true)
    state.setCancelAllError('')
  }, [state])

  const confirmCancelAllOffers = useCallback(async () => {
    state.setIsCancellingAll(true)
    state.setCancelAllError('')

    try {
      const activeOffers = await offerStorage.getOffersByStatus('active')

      if (activeOffers.length === 0) {
        state.setCancelAllError('No active offers to cancel')
        state.setIsCancellingAll(false)
        return
      }

      await cancelAllActiveOffers(activeOffers, cancelOfferMutation, offerStorage.updateOffer)
      state.setShowCancelAllConfirmation(false)
      await refreshOffers()
    } catch (error) {
      state.setCancelAllError(
        `Failed to cancel all offers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsCancellingAll(false)
    }
  }, [state, cancelOfferMutation, offerStorage, refreshOffers])

  const handleCancelAllDialogClose = useCallback(() => {
    state.setShowCancelAllConfirmation(false)
    state.setCancelAllError('')
  }, [state])

  const deleteAllOffers = useCallback(() => {
    state.setShowDeleteAllConfirmation(true)
    state.setDeleteAllError('')
  }, [state])

  const confirmDeleteAllOffers = useCallback(async () => {
    state.setIsDeletingAll(true)
    state.setDeleteAllError('')

    try {
      await offerStorage.clearAllOffers()
      state.setOffers([])
      state.setTotalOffers(0)
      state.setTotalPages(0)
      state.setCurrentPage(1)
      state.setShowDeleteAllConfirmation(false)
    } catch (error) {
      state.setDeleteAllError(
        `Failed to delete all offers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsDeletingAll(false)
    }
  }, [state, offerStorage])

  const handleDeleteAllDialogClose = useCallback(() => {
    state.setShowDeleteAllConfirmation(false)
    state.setDeleteAllError('')
  }, [state])

  return {
    cancelAllOffers,
    confirmCancelAllOffers,
    handleCancelAllDialogClose,
    deleteAllOffers,
    confirmDeleteAllOffers,
    handleDeleteAllDialogClose,
  }
}
