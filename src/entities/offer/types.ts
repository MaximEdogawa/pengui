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
