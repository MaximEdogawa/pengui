// Offer types for the Penguin Pool application

// Import shared asset types
export type AssetAmount = number // Always use float numbers for precision
export type AssetType = 'xch' | 'cat' | 'nft' | 'option'

// Base asset interface
export interface BaseAsset {
  assetId: string
  amount: AssetAmount
  type: AssetType
  symbol?: string
  name?: string
}

export type OfferAsset = BaseAsset

// Offer state types matching the UI requirements
export type OfferState =
  | 'Open'
  | 'Pending'
  | 'Cancelling'
  | 'Cancelled'
  | 'Completed'
  | 'Unknown'
  | 'Expired'

// Legacy status types for backward compatibility
export type OfferStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'expired' | 'failed'

export interface OfferRequest {
  walletId: number
  offer: string
  fee?: AssetAmount
}

export interface OfferResponse {
  offer: string
  tradeId: string
}

export interface TakeOfferRequest {
  offer: string
  fee?: number
}

export interface TakeOfferResponse {
  tradeId: string
  success: boolean
}

/**
 * Dexie API Types
 * Data structures for Dexie API responses
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

export interface CancelOfferRequest {
  tradeId: string
  fee?: number
}

export interface CancelOfferResponse {
  success: boolean
}

export interface OfferDetails {
  id: string
  tradeId: string
  offerString: string
  status: OfferStatus // Legacy status for backward compatibility
  state?: OfferState // New state field for UI indicators
  createdAt: Date
  expiresAt?: Date
  assetsOffered: OfferAsset[]
  assetsRequested: OfferAsset[]
  fee: AssetAmount
  creatorAddress?: string
  dexieOfferId?: string
  dexieStatus?: OfferState // Store the calculated state from Dexie
  uploadedToDexie?: boolean
  dexieOfferData?: unknown // Store the full Dexie response data

  // Date fields for state calculation
  dateFound?: string
  dateCompleted?: string
  datePending?: string
  dateExpiry?: string
  blockExpiry?: number
  spentBlockIndex?: number

  // Additional state indicators
  knownTaker?: unknown // null = cancelled, not null = completed
}

export interface CreateOfferForm {
  assetsOffered: OfferAsset[]
  assetsRequested: OfferAsset[]
  fee: AssetAmount
  memo?: string
  expirationHours?: number
}

export interface OfferFilters {
  status?: string
  assetType?: AssetType
  minAmount?: AssetAmount
  maxAmount?: AssetAmount
}

export interface OfferSortOptions {
  field: 'createdAt' | 'amount' | 'status' | 'expiresAt'
  direction: 'asc' | 'desc'
}

// Wallet request interfaces for better type safety
export interface WalletOfferAsset {
  assetId: string
  amount: AssetAmount // Explicitly use float numbers
}

export interface CreateOfferWalletRequest {
  walletId: number
  offerAssets: WalletOfferAsset[]
  requestAssets: WalletOfferAsset[]
  fee: number
}

export interface CreateOfferWalletResponse {
  success: boolean
  offerId?: string
  data?: {
    offerId: string
    offerString: string
    fee: number
    status: string
  }
  error?: string | null
}

export interface TakeOfferWalletRequest {
  offer: string
  fee?: number
}

export interface TakeOfferWalletResponse {
  success: boolean
  tradeId?: string
  error?: string | null
}

export interface CancelOfferWalletRequest {
  offerId: string
  fee?: number
}

export interface CancelOfferWalletResponse {
  success: boolean
  error?: string | null
}

/**
 * Convert OfferState to legacy OfferStatus for backward compatibility
 */
export function convertOfferStateToStatus(offerState: OfferState): OfferStatus {
  switch (offerState) {
    case 'Open':
      return 'active'
    case 'Pending':
    case 'Cancelling':
      return 'pending'
    case 'Cancelled':
      return 'cancelled'
    case 'Completed':
      return 'completed'
    case 'Expired':
      return 'expired'
    case 'Unknown':
    default:
      return 'failed'
  }
}

/**
 * Convert legacy OfferStatus to OfferState
 */
export function convertStatusToOfferState(status: OfferStatus): OfferState {
  switch (status) {
    case 'active':
      return 'Open'
    case 'pending':
      return 'Pending'
    case 'cancelled':
      return 'Cancelled'
    case 'completed':
      return 'Completed'
    case 'expired':
      return 'Expired'
    case 'failed':
    default:
      return 'Unknown'
  }
}

/**
 * Get display text for offer state
 */
export function getOfferStateDisplayText(state: OfferState): string {
  switch (state) {
    case 'Open':
      return 'Open'
    case 'Pending':
      return 'Pending'
    case 'Cancelling':
      return 'Cancelling'
    case 'Cancelled':
      return 'Cancelled'
    case 'Completed':
      return 'Completed'
    case 'Expired':
      return 'Expired'
    case 'Unknown':
    default:
      return 'Unknown'
  }
}

/**
 * Get CSS class for offer state styling
 */
export function getOfferStateClass(state: OfferState): string {
  switch (state) {
    case 'Open':
      return 'offer-state-open'
    case 'Pending':
      return 'offer-state-pending'
    case 'Cancelling':
      return 'offer-state-cancelling'
    case 'Cancelled':
      return 'offer-state-cancelled'
    case 'Completed':
      return 'offer-state-completed'
    case 'Expired':
      return 'offer-state-expired'
    case 'Unknown':
    default:
      return 'offer-state-unknown'
  }
}

/**
 * Dexie API Types
 * Data structures for Dexie API responses
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

  // Helper functions
  const isCancelled = (spentBlockIndex: number | null | undefined): boolean => {
    return spentBlockIndex !== null && spentBlockIndex !== undefined
  }

  const isCompleted = (dateCompleted: Date | null, knownTaker: unknown | null | undefined): boolean => {
    const hasValidKnownTaker = knownTaker !== null && knownTaker !== undefined
    return dateCompleted !== null && hasValidKnownTaker
  }

  const isPending = (datePending: Date | null): boolean => {
    return datePending !== null
  }

  const isExpiredByDate = (dateExpiry: Date | null): boolean => {
    if (!dateExpiry) return false
    const now = new Date()
    return dateExpiry < now
  }

  const isExpiredByBlock = (
    blockExpiry: number | null | undefined,
    currentBlockHeight: number | null | undefined
  ): boolean => {
    if (blockExpiry === null || blockExpiry === undefined) return false
    if (currentBlockHeight === null || currentBlockHeight === undefined) return false
    return currentBlockHeight >= blockExpiry
  }

  const isWithinExpiry = (
    dateExpiry: Date | null,
    blockExpiry: number | null | undefined,
    currentBlockHeight: number | null | undefined
  ): boolean => {
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

  const isOpen = (
    dateFound: Date | null,
    dateCompleted: Date | null,
    expiryConfig: {
      dateExpiry: Date | null
      blockExpiry: number | null | undefined
      currentBlockHeight: number | null | undefined
    }
  ): boolean => {
    if (!dateFound || dateCompleted) return false
    return isWithinExpiry(expiryConfig.dateExpiry, expiryConfig.blockExpiry, expiryConfig.currentBlockHeight)
  }

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
