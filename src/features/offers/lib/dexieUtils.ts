import type { OfferState } from '@/entities/offer'

/**
 * Dexie Offer types
 */
export interface DexieAsset {
  id: string
  code: string
  name: string
  amount: number
}

export interface DexieOffer {
  id: string
  status: number // Legacy field - we'll calculate state from dates instead
  offer?: string // Original offer string (available in POST responses)
  date_found: string
  date_completed?: string | null
  date_pending?: string | null
  date_expiry?: string | null
  block_expiry?: number | null
  spent_block_index?: number | null
  price: number
  offered: DexieAsset[]
  requested: DexieAsset[]
  fees: number
  known_taker?: unknown | null // null = cancelled, not null = completed
}

/**
 * Calculate offer state based on date fields and known_taker according to the specified logic:
 * Priority order (checked in sequence):
 * 1. CANCELLED: if spent_block_index exists (coin was spent = cancelled, highest priority)
 * 2. COMPLETED: if date_completed exists AND known_taker is not null
 * 3. PENDING: if date_pending exists (but not if already cancelled or completed)
 * 4. EXPIRED: if date_expiry is in the past OR block_expiry has been reached
 * 5. OPEN: if date_found exists but no completion, no spending, within expiry
 * 6. UNKNOWN: if every date is null
 *
 * @param offer - The Dexie offer to calculate state for
 * @param currentBlockHeight - Optional current blockchain height for block_expiry comparison
 *                             If not provided, block_expiry will not be used to determine expiry
 */
export function calculateOfferState(
  offer: DexieOffer,
  currentBlockHeight?: number | null
): OfferState {
  // Extract and normalize data
  const dateFound = offer.date_found ? new Date(offer.date_found) : null
  const dateCompleted = offer.date_completed ? new Date(offer.date_completed) : null
  const datePending = offer.date_pending ? new Date(offer.date_pending) : null
  const dateExpiry = offer.date_expiry ? new Date(offer.date_expiry) : null
  const blockExpiry = offer.block_expiry
  const spentBlockIndex = offer.spent_block_index
  const knownTaker = offer.known_taker

  const hasValidKnownTaker = knownTaker !== null && knownTaker !== undefined
  const hasValidSpentBlockIndex = spentBlockIndex !== null && spentBlockIndex !== undefined
  const hasValidBlockExpiry = blockExpiry !== null && blockExpiry !== undefined

  // 1. CANCELLED: spent_block_index exists (coin was spent, offer cancelled) - highest priority
  // This takes precedence because if the coin was spent, the offer is definitely cancelled
  if (hasValidSpentBlockIndex) return 'Cancelled'

  // 2. COMPLETED: date_completed exists AND known_taker is not null
  // If completed and has a known taker, it's completed
  if (dateCompleted && hasValidKnownTaker) return 'Completed'

  // 3. PENDING: date_pending exists (but only if not cancelled or completed)
  // If date_pending exists, the offer is in pending state
  if (datePending) return 'Pending'

  // 4. EXPIRED: Check if offer has expired based on date or block height
  const now = new Date()

  // Check date_expiry: compare with current time, not date_found
  // An offer expires when date_expiry is in the past
  if (dateExpiry && dateExpiry < now) {
    return 'Expired'
  }

  // Check block_expiry: only mark as expired if current block height is available
  // and has reached or exceeded the expiry block
  // TODO: This requires access to current blockchain height. Without it, we cannot
  // accurately determine if block_expiry has been reached. Consider fetching current
  // block height from wallet/chain service when available.
  if (hasValidBlockExpiry && currentBlockHeight !== null && currentBlockHeight !== undefined) {
    if (currentBlockHeight >= blockExpiry) {
      return 'Expired'
    }
  }

  // 5. OPEN: date_found exists, no completion, no spending, within expiry (if any)
  // If found but not completed, cancelled, or expired, it's open
  if (dateFound && !dateCompleted) {
    // Check if still within expiry window
    const isWithinDateExpiry = !dateExpiry || dateExpiry >= now
    const isWithinBlockExpiry =
      !hasValidBlockExpiry ||
      currentBlockHeight === null ||
      currentBlockHeight === undefined ||
      currentBlockHeight < blockExpiry

    if (isWithinDateExpiry && isWithinBlockExpiry) {
      return 'Open'
    }
  }

  // 6. UNKNOWN: if every date is null
  return 'Unknown'
}

/**
 * Helper function to check if an offer state indicates completion
 */
export function isOfferCompleted(state: OfferState): boolean {
  return state === 'Completed'
}

/**
 * Helper function to check if an offer state indicates cancellation
 */
export function isOfferCancelled(state: OfferState): boolean {
  return state === 'Cancelled'
}

/**
 * Helper function to check if an offer state indicates it's still active
 */
export function isOfferActive(state: OfferState): boolean {
  return state === 'Open' || state === 'Pending'
}

/**
 * Helper function to check if an offer state indicates it's finalized
 */
export function isOfferFinalized(state: OfferState): boolean {
  return state === 'Completed' || state === 'Cancelled' || state === 'Expired'
}
