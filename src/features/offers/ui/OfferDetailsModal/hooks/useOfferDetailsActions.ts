import type { OfferDetails } from '@/entities/offer'
import { useOfferDetailsState } from './useOfferDetailsState'
import { useOfferDetailsHandlers } from './useOfferDetailsHandlers'

interface UseOfferDetailsActionsProps {
  offer: OfferDetails
  onOfferCancelled: (offer: OfferDetails) => void
  onOfferDeleted: (offer: OfferDetails) => void
  onOfferUpdated: (offer: OfferDetails) => void
  onClose: () => void
}

export function useOfferDetailsActions({
  offer,
  onOfferCancelled,
  onOfferDeleted,
  onOfferUpdated,
  onClose,
}: UseOfferDetailsActionsProps) {
  const state = useOfferDetailsState()
  const handlers = useOfferDetailsHandlers({
    offer,
    onOfferCancelled,
    onOfferDeleted,
    onOfferUpdated,
    onClose,
    state,
  })

  return {
    isCancelling: state.isCancelling,
    isDeleting: state.isDeleting,
    isValidating: state.isValidating,
    isStateValidating: state.isStateValidating,
    isUploading: handlers.isUploading,
    isCopied: state.isCopied,
    showCancelConfirmation: state.showCancelConfirmation,
    showDeleteConfirmation: state.showDeleteConfirmation,
    cancelError: state.cancelError,
    deleteError: state.deleteError,
    uploadError: state.uploadError,
    validationError: state.validationError,
    stateValidationError: state.stateValidationError,
    copyOfferString: handlers.copyOfferString,
    copyOfferId: handlers.copyOfferId,
    cancelOffer: handlers.cancelOffer,
    confirmCancelOffer: handlers.confirmCancelOffer,
    deleteOffer: handlers.deleteOffer,
    confirmDeleteOffer: handlers.confirmDeleteOffer,
    uploadToDexie: handlers.uploadToDexie,
    handleValidateOfferState: handlers.handleValidateOfferState,
    handleStartStateValidation: handlers.handleStartStateValidation,
    handleStopStateValidation: handlers.handleStopStateValidation,
    setShowCancelConfirmation: state.setShowCancelConfirmation,
    setShowDeleteConfirmation: state.setShowDeleteConfirmation,
  }
}
