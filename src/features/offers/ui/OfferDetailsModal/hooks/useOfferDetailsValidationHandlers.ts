import { useCallback } from 'react'
import { convertOfferStateToStatus, type OfferDetails } from '@/entities/offer'
import { useOfferStorage, useOfferInspection } from '../../../model'
import { calculateOfferState } from '../../../lib/dexieUtils'
import type { UseOfferDetailsStateReturn } from './useOfferDetailsState'

interface UseOfferDetailsValidationHandlersProps {
  offer: OfferDetails
  onOfferUpdated: (offer: OfferDetails) => void
  onOfferDeleted: (offer: OfferDetails) => void
  onClose: () => void
  state: UseOfferDetailsStateReturn
}

/**
 * Extract validation handlers to reduce useOfferDetailsHandlers size
 */
export function useOfferDetailsValidationHandlers({
  offer,
  onOfferUpdated,
  onOfferDeleted,
  onClose,
  state,
}: UseOfferDetailsValidationHandlersProps) {
  const offerStorage = useOfferStorage()
  const { inspectOffer } = useOfferInspection()

  const handleValidateOfferState = useCallback(async () => {
    if (!offer.dexieOfferId) {
      state.setValidationError('No Dexie offer ID available for validation')
      return
    }

    state.setIsValidating(true)
    state.setValidationError('')

    try {
      const result = await inspectOffer(offer.dexieOfferId)

      if (result && result.success && result.offer) {
        const calculatedState = calculateOfferState(result.offer)
        const convertedStatus = convertOfferStateToStatus(calculatedState)

        try {
          await offerStorage.updateOffer(offer.id, {
            dexieStatus: calculatedState,
            status: convertedStatus,
            dexieOfferData: result.offer,
          })

          const updatedOffer = {
            ...offer,
            dexieStatus: calculatedState,
            status: convertedStatus,
            dexieOfferData: result.offer,
          }
          await onOfferUpdated(updatedOffer)
        } catch (updateError) {
          if (
            updateError instanceof Error &&
            updateError.message.includes('No offer found with ID')
          ) {
            state.setValidationError('This offer has been deleted. Closing modal...')
            await onOfferDeleted(offer)
            onClose()
          } else {
            throw updateError
          }
        }
      } else {
        state.setValidationError('Failed to validate offer state')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      state.setValidationError(`Failed to validate offer: ${errorMsg}`)
    } finally {
      state.setIsValidating(false)
    }
  }, [offer, inspectOffer, offerStorage, onOfferUpdated, onOfferDeleted, onClose, state])

  const handleStartStateValidation = useCallback(() => {
    if (!offer.dexieOfferId) {
      state.setStateValidationError('No Dexie offer ID available for validation')
      return
    }

    state.setIsStateValidating(true)
    state.setStateValidationError('')

    handleValidateOfferState()

    state.validationIntervalRef.current = setInterval(() => {
      handleValidateOfferState()
    }, 30000)
  }, [offer.dexieOfferId, handleValidateOfferState, state])

  const handleStopStateValidation = useCallback(() => {
    if (state.validationIntervalRef.current) {
      clearInterval(state.validationIntervalRef.current)
      state.validationIntervalRef.current = null
    }
    state.setIsStateValidating(false)
  }, [state])

  return {
    handleValidateOfferState,
    handleStartStateValidation,
    handleStopStateValidation,
  }
}
