import { useCallback } from 'react'
import type { OfferDetails } from '@/entities/offer'
import { useCancelOffer } from '@/features/wallet'
import { getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import { useOfferStorage, useOfferUpload } from '../../../model'
import type { UseOfferDetailsStateReturn } from './useOfferDetailsState'
import { useOfferDetailsCopyHandlers } from './useOfferDetailsCopyHandlers'
import { useOfferDetailsValidationHandlers } from './useOfferDetailsValidationHandlers'

interface UseOfferDetailsHandlersProps {
  offer: OfferDetails
  onOfferCancelled: (offer: OfferDetails) => void
  onOfferDeleted: (offer: OfferDetails) => void
  onOfferUpdated: (offer: OfferDetails) => void
  onClose: () => void
  state: UseOfferDetailsStateReturn
}

export function useOfferDetailsHandlers({
  offer,
  onOfferCancelled,
  onOfferDeleted,
  onOfferUpdated,
  onClose,
  state,
}: UseOfferDetailsHandlersProps) {
  const cancelOfferMutation = useCancelOffer()
  const offerStorage = useOfferStorage()
  const { uploadOfferToDexie, isUploading } = useOfferUpload()

  // Extract copy handlers
  const { copyOfferString, copyOfferId } = useOfferDetailsCopyHandlers({
    offerString: offer.offerString,
    offerId: offer.tradeId,
    state,
  })

  // Extract validation handlers
  const {
    handleValidateOfferState,
    handleStartStateValidation,
    handleStopStateValidation,
  } = useOfferDetailsValidationHandlers({
    offer,
    onOfferUpdated,
    onOfferDeleted,
    onClose,
    state,
  })

  const cancelOffer = useCallback(() => {
    state.setShowCancelConfirmation(true)
  }, [state])

  const confirmCancelOffer = useCallback(async () => {
    state.setIsCancelling(true)
    state.setCancelError('')

    try {
      const fee = offer.fee ?? getMinimumFeeInXch()

      await cancelOfferMutation.mutateAsync({
        id: offer.tradeId,
        fee: fee,
      })

      await offerStorage.updateOffer(offer.id, { status: 'cancelled' })

      const updatedOffer = { ...offer, status: 'cancelled' as const }
      await onOfferCancelled(updatedOffer)
      state.setShowCancelConfirmation(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      state.setCancelError(`Failed to cancel offer: ${errorMsg}`)
    } finally {
      state.setIsCancelling(false)
    }
  }, [offer, cancelOfferMutation, offerStorage, onOfferCancelled, state])

  const deleteOffer = useCallback(() => {
    state.setShowDeleteConfirmation(true)
  }, [state])

  const confirmDeleteOffer = useCallback(async () => {
    state.setIsDeleting(true)
    state.setDeleteError('')

    try {
      await offerStorage.deleteOffer(offer.id)
      await onOfferDeleted(offer)
      state.setShowDeleteConfirmation(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      state.setDeleteError(`Failed to delete offer: ${errorMsg}`)
    } finally {
      state.setIsDeleting(false)
    }
  }, [offer, offerStorage, onOfferDeleted, state])

  const uploadToDexie = useCallback(async () => {
    if (!offer.offerString) {
      state.setUploadError('No offer string available to upload')
      return
    }

    state.setUploadError('')

    try {
      const result = await uploadOfferToDexie(offer.id, offer.offerString)

      const updatedOffer = {
        ...offer,
        dexieOfferId: result.dexieId,
        dexieStatus: result.dexieStatus,
        uploadedToDexie: true,
      }
      await onOfferUpdated(updatedOffer)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      state.setUploadError(`Failed to upload to Dexie: ${errorMsg}`)
    }
  }, [offer, uploadOfferToDexie, onOfferUpdated, state])


  return {
    isUploading,
    copyOfferString,
    copyOfferId,
    cancelOffer,
    confirmCancelOffer,
    deleteOffer,
    confirmDeleteOffer,
    uploadToDexie,
    handleValidateOfferState,
    handleStartStateValidation,
    handleStopStateValidation,
  }
}
