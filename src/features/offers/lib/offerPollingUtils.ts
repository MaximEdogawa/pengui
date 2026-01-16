import type { MutableRefObject } from 'react'
import type { DexiePostOfferResponse } from '../lib/dexieTypes'
import { calculateOfferState } from './dexieUtils'
import type { OfferDetails, OfferStatus } from '@/entities/offer'

/**
 * Extract date fields from Dexie offer response
 */
export function extractOfferDateFields(result: DexiePostOfferResponse) {
  if (!result.success || !result.offer) {
    return null
  }

  return {
    dateFound: result.offer.date_found,
    dateCompleted: result.offer.date_completed,
    datePending: result.offer.date_pending,
    dateExpiry: result.offer.date_expiry,
    blockExpiry: result.offer.block_expiry,
    spentBlockIndex: result.offer.spent_block_index,
    knownTaker: result.offer.known_taker,
    offer: result.offer,
  }
}

/**
 * Create a unique update key for an offer update
 */
export function createUpdateKey(
  offerId: string,
  dateFields: {
    dateFound: string | null | undefined
    dateCompleted: string | null | undefined
    datePending: string | null | undefined
    dateExpiry: string | null | undefined
    blockExpiry: number | null | undefined
    spentBlockIndex: number | null | undefined
    knownTaker: unknown | null | undefined
  }
): string {
  const {
    dateFound,
    dateCompleted,
    datePending,
    dateExpiry,
    blockExpiry,
    spentBlockIndex,
    knownTaker,
  } = dateFields

  return `${offerId}-${dateFound || ''}-${dateCompleted || ''}-${datePending || ''}-${dateExpiry || ''}-${blockExpiry || ''}-${spentBlockIndex || ''}-${knownTaker !== null && knownTaker !== undefined ? String(knownTaker) : ''}`
}

/**
 * Map calculated state to legacy status
 */
export function mapStateToStatus(calculatedState: string, currentStatus: OfferStatus): OfferStatus {
  if (calculatedState === 'Completed') {
    return 'completed'
  }
  if (calculatedState === 'Cancelled' || calculatedState === 'Expired') {
    return 'cancelled'
  }
  if (calculatedState === 'Pending') {
    return 'pending'
  }
  if (calculatedState === 'Open') {
    return 'active'
  }
  return currentStatus
}

/**
 * Check if offer needs to be updated
 */
export function needsOfferUpdate(
  currentOffer: OfferDetails,
  calculatedState: string,
  dateFields: {
    datePending: string | null | undefined
    dateCompleted: string | null | undefined
    dateFound: string | null | undefined
    dateExpiry: string | null | undefined
  }
): boolean {
  const currentState = currentOffer.dexieStatus || currentOffer.state
  return (
    currentState !== calculatedState ||
    currentOffer.datePending !== dateFields.datePending ||
    currentOffer.dateCompleted !== dateFields.dateCompleted ||
    currentOffer.dateFound !== dateFields.dateFound ||
    currentOffer.dateExpiry !== dateFields.dateExpiry
  )
}

/**
 * Clean up processed updates ref to prevent memory leaks
 */
export function cleanupProcessedUpdates(processedUpdatesRef: MutableRefObject<Set<string>>) {
  if (processedUpdatesRef.current.size > 100) {
    const entries = Array.from(processedUpdatesRef.current)
    processedUpdatesRef.current.clear()
    entries.slice(-50).forEach((key) => processedUpdatesRef.current.add(key))
  }
}

/**
 * Prepare offer update data
 */
export function prepareOfferUpdate(
  offerId: string,
  dateFields: {
    dateFound: string | null | undefined
    dateCompleted: string | null | undefined
    datePending: string | null | undefined
    dateExpiry: string | null | undefined
    blockExpiry: number | null | undefined
    spentBlockIndex: number | null | undefined
    knownTaker: unknown | null | undefined
    offer: unknown
  },
  calculatedState: string,
  newStatus: OfferStatus
): Partial<OfferDetails> {
  return {
    dexieOfferData: dateFields.offer,
    dexieStatus: calculatedState as OfferDetails['dexieStatus'],
    state: calculatedState as OfferDetails['state'],
    status: newStatus,
    dateFound: dateFields.dateFound || undefined,
    dateCompleted: dateFields.dateCompleted || undefined,
    datePending: dateFields.datePending || undefined,
    dateExpiry: dateFields.dateExpiry || undefined,
    blockExpiry: dateFields.blockExpiry || undefined,
    spentBlockIndex: dateFields.spentBlockIndex || undefined,
    knownTaker: dateFields.knownTaker,
  }
}

/**
 * Configuration for processing offer updates
 */
interface ProcessOfferUpdateConfig {
  offerId: string
  result: DexiePostOfferResponse
  currentOffer: OfferDetails | undefined
  processedUpdatesRef: MutableRefObject<Set<string>>
  updateOffer: (offerId: string, updates: Partial<OfferDetails>) => Promise<void>
}

/**
 * Process a single offer update from polling
 */
export async function processOfferUpdate(
  config: ProcessOfferUpdateConfig
): Promise<void> {
  const { offerId, result, currentOffer, processedUpdatesRef, updateOffer: updateOfferFn } = config
  if (!currentOffer) return

  const dateFields = extractOfferDateFields(result)
  if (!dateFields) return

  const updateKey = createUpdateKey(offerId, dateFields)

  // Skip if we've already processed this exact update
  if (processedUpdatesRef.current.has(updateKey)) {
    return
  }

  // Calculate the offer state from date fields
  const calculatedState = calculateOfferState(dateFields.offer)

  // Map calculated state to legacy status
  const newStatus = mapStateToStatus(calculatedState, currentOffer.status)

  // Check if we need to update
  if (!needsOfferUpdate(currentOffer, calculatedState, dateFields)) {
    return
  }

  // Mark this update as processed
  processedUpdatesRef.current.add(updateKey)

  // Clean up old processed updates
  cleanupProcessedUpdates(processedUpdatesRef)

  // Prepare update data
  const updateData = prepareOfferUpdate(offerId, dateFields, calculatedState, newStatus)

  // Update in IndexedDB
  await updateOfferFn(offerId, updateData)

  // Trigger a refresh event so the UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offer-status-updated', { detail: { offerId } }))
  }
}
