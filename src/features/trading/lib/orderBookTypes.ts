/**
 * Order Book Types
 * Type definitions for the order book trading view
 */

export interface DexieAssetItem {
  id: string
  code: string
  name: string
  amount: number
}

export interface OrderBookOrder {
  id: string
  offering: DexieAssetItem[]
  requesting: DexieAssetItem[]
  maker: string
  timestamp: string
  offeringUsdValue: number
  requestingUsdValue: number
  offeringXchValue: number
  requestingXchValue: number
  pricePerUnit: number
  status: number
  date_found: string
  date_completed?: string | null
  date_pending?: string | null
  date_expiry?: string | null
  known_taker?: unknown | null
  offerString?: string
  creatorAddress?: string
}

export type OrderBookPagination = 10 | 15 | 50 | 100 | 'all'

export interface OrderBookFilters {
  buyAsset?: string[]
  sellAsset?: string[]
  status?: string[]
  pagination?: OrderBookPagination
}

export interface SuggestionItem {
  value: string
  column: string
  label: string
}

export interface OrderBookQueryResult {
  orders: OrderBookOrder[]
  hasMore: boolean
  total: number
}
