import { useCallback } from 'react'
import type { UseOfferDetailsStateReturn } from './useOfferDetailsState'

interface UseOfferDetailsCopyHandlersProps {
  offerString: string
  offerId: string
  state: UseOfferDetailsStateReturn
}

/**
 * Extract copy handlers to reduce useOfferDetailsHandlers size
 */
export function useOfferDetailsCopyHandlers({
  offerString,
  offerId,
  state,
}: UseOfferDetailsCopyHandlersProps) {
  const copyOfferString = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(offerString)
      state.setIsCopied(true)
      setTimeout(() => {
        state.setIsCopied(false)
      }, 2000)
    } catch {
      // Failed to copy
    }
  }, [offerString, state])

  const copyOfferId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(offerId)
      state.setIsCopied(true)
      setTimeout(() => {
        state.setIsCopied(false)
      }, 2000)
    } catch {
      // Failed to copy
    }
  }, [offerId, state])

  return {
    copyOfferString,
    copyOfferId,
  }
}
