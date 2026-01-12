/**
 * Dexie API Types
 */

export interface DexieTicker {
  ticker_id: string
  base_currency: string
  target_currency: string
  base_code: string
  target_code: string
  base_name: string
  target_name: string
  last_price: number
  current_avg_price: number
  base_volume: number
  target_volume: number
  base_volume_7d: number
  target_volume_7d: number
  base_volume_30d: number
  target_volume_30d: number
  pool_id: string
  bid: number | null
  ask: number | null
  high: number | null
  low: number | null
  high_7d: number | null
  low_7d: number | null
  high_30d: number | null
  low_30d: number | null
}

export interface DexieTickerResponse {
  success: boolean
  data: DexieTicker[]
}

export interface DexiePair {
  pair_id: string
  base_asset: string
  quote_asset: string
  last_price: number
  base_volume: number
  quote_volume: number
}

export interface DexiePairsResponse {
  success: boolean
  data: DexiePair[]
}

export interface DexieOrderBookEntry {
  price: number
  volume: number
}

export interface DexieOrderBook {
  ticker_id: string
  bids: DexieOrderBookEntry[]
  asks: DexieOrderBookEntry[]
}

export interface DexieOrderBookResponse {
  success: boolean
  data: DexieOrderBook
}

export interface DexieHistoricalTrade {
  trade_id: string
  ticker_id: string
  price: number
  volume: number
  timestamp: number
  side: 'buy' | 'sell'
}

export interface DexieHistoricalTradesResponse {
  success: boolean
  data: DexieHistoricalTrade[]
}

export interface DexieOfferSearchParams {
  requested?: string
  offered?: string
  maker?: string
  page_size?: number
  page?: number
  status?: number
}

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

export interface DexieOfferSearchResponse {
  success: boolean
  data: DexieOffer[] | unknown[]
  total: number
  page: number
  page_size: number
}

export interface DexiePostOfferParams {
  offer: string
  drop_only?: boolean
  claim_rewards?: boolean
}

export interface DexiePostOfferResponse {
  success: boolean
  id: string
  known: boolean
  offer: DexieOffer | null
  error_message?: string
}
