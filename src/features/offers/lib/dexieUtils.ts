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
 * Check if offer is cancelled (spent_block_index exists)
 */
function isCancelled(spentBlockIndex: number | null | undefined): boolean {
  return spentBlockIndex !== null && spentBlockIndex !== undefined
}

/**
 * Check if offer is completed (date_completed exists AND known_taker is not null)
 */
function isCompleted(
  dateCompleted: Date | null,
  knownTaker: unknown | null | undefined
): boolean {
  const hasValidKnownTaker = knownTaker !== null && knownTaker !== undefined
  return dateCompleted !== null && hasValidKnownTaker
}

/**
 * Check if offer is pending (date_pending exists)
 */
function isPending(datePending: Date | null): boolean {
  return datePending !== null
}

/**
 * Check if offer has expired based on date_expiry
 */
function isExpiredByDate(dateExpiry: Date | null): boolean {
  if (!dateExpiry) return false
  const now = new Date()
  return dateExpiry < now
}

/**
 * Check if offer has expired based on block_expiry
 */
function isExpiredByBlock(
  blockExpiry: number | null | undefined,
  currentBlockHeight: number | null | undefined
): boolean {
  if (blockExpiry === null || blockExpiry === undefined) return false
  if (currentBlockHeight === null || currentBlockHeight === undefined) return false
  return currentBlockHeight >= blockExpiry
}

/**
 * Check if offer is within expiry window
 */
function isWithinExpiry(
  dateExpiry: Date | null,
  blockExpiry: number | null | undefined,
  currentBlockHeight: number | null | undefined
): boolean {
  const now = new Date()
  const isWithinDateExpiry = !dateExpiry || dateExpiry >= now
  const hasValidBlockExpiry = blockExpiry !== null && blockExpiry !== undefined
  const isWithinBlockExpiry =
    !hasValidBlockExpiry ||
    currentBlockHeight === null ||
    currentBlockHeight === undefined ||
    currentBlockHeight < blockExpiry

  return isWithinDateExpiry && isWithinBlockExpiry
}

/**
 * Check if offer is open (date_found exists, no completion, within expiry)
 */
function isOpen(
  dateFound: Date | null,
  dateCompleted: Date | null,
  expiryConfig: {
    dateExpiry: Date | null
    blockExpiry: number | null | undefined
    currentBlockHeight: number | null | undefined
  }
): boolean {
  if (!dateFound || dateCompleted) return false
  return isWithinExpiry(expiryConfig.dateExpiry, expiryConfig.blockExpiry, expiryConfig.currentBlockHeight)
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

  // 1. CANCELLED: spent_block_index exists (coin was spent, offer cancelled) - highest priority
  if (isCancelled(spentBlockIndex)) return 'Cancelled'

  // 2. COMPLETED: date_completed exists AND known_taker is not null
  if (isCompleted(dateCompleted, knownTaker)) return 'Completed'

  // 3. PENDING: date_pending exists (but only if not cancelled or completed)
  if (isPending(datePending)) return 'Pending'

  // 4. EXPIRED: Check if offer has expired based on date or block height
  if (isExpiredByDate(dateExpiry)) return 'Expired'
  if (isExpiredByBlock(blockExpiry, currentBlockHeight)) return 'Expired'

  // 5. OPEN: date_found exists, no completion, no spending, within expiry (if any)
  if (isOpen(dateFound, dateCompleted, { dateExpiry, blockExpiry, currentBlockHeight })) {
    return 'Open'
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
