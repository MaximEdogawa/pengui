import { calculateOfferState } from '@/features/offers/lib/dexieUtils'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import type { OfferState, OfferStatus } from '@/entities/offer'
import { convertOfferStateToStatus, convertStatusToOfferState } from '@/entities/offer'

/**
 * Calculate offer state from Dexie offer data
 * Re-export from dexieUtils for convenience
 */
export { calculateOfferState }

/**
 * Convert offer state to app status
 */
export function convertOfferStateToAppStatus(state: OfferState): OfferStatus {
  return convertOfferStateToStatus(state)
}

/**
 * Convert app status to offer state
 */
export function convertAppStatusToOfferState(status: OfferStatus): OfferState {
  return convertStatusToOfferState(status)
}

/**
 * Validate offer string format
 */
export function validateOfferString(offerString: string): boolean {
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

/**
 * Get offer state from Dexie offer
 */
export function getOfferStateFromDexieOffer(offer: DexieOffer | null | undefined): OfferState {
  if (!offer) {
    return 'Unknown'
  }

  return calculateOfferState(offer)
}

/**
 * Check if offer is active
 */
export function isOfferActiveState(state: OfferState): boolean {
  return state === 'Open' || state === 'Pending'
}

/**
 * Check if offer is finalized
 */
export function isOfferFinalizedState(state: OfferState): boolean {
  return state === 'Completed' || state === 'Cancelled' || state === 'Expired'
}

/**
 * Check if offer can be cancelled
 */
export function canCancelOffer(state: OfferState | OfferStatus): boolean {
  const offerState: OfferState =
    typeof state === 'string' &&
    ['Open', 'Pending', 'Cancelling', 'Cancelled', 'Completed', 'Unknown', 'Expired'].includes(
      state
    )
      ? (state as OfferState)
      : convertStatusToOfferState(state as OfferStatus)

  return offerState === 'Open' || offerState === 'Pending'
}

/**
 * Check if offer can be uploaded to Dexie
 */
export function canUploadToDexie(offerString: string | null | undefined): boolean {
  if (!offerString) {
    return false
  }

  return validateOfferString(offerString)
}

/**
 * Get Dexie status description from status number
 */
export function getDexieStatusDescription(status: number | string | OfferState): string {
  if (typeof status === 'string') {
    // If it's already a string (OfferState), return it
    if (
      ['Open', 'Pending', 'Cancelling', 'Cancelled', 'Completed', 'Unknown', 'Expired'].includes(
        status
      )
    ) {
      return status
    }
    return status
  }

  switch (status) {
    case 0:
      return 'Open'
    case 1:
      return 'Pending'
    case 2:
      return 'Cancelling'
    case 3:
      return 'Cancelled'
    case 4:
      return 'Completed'
    case 5:
      return 'Unknown'
    case 6:
      return 'Expired'
    default:
      return 'Unknown'
  }
}
