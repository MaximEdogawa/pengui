/**
 * Dexie API Types
 */

import type { DexieOffer } from '@/entities/offer'

// Re-export for backward compatibility
export type { DexieOffer, DexieAsset } from '@/entities/offer'

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
  ticker_id?: string // May be in response wrapper instead
  price: number
  volume?: number // Legacy field, prefer base_volume/target_volume
  base_volume?: number // Actual API field
  target_volume?: number // Actual API field
  timestamp?: number // Legacy field, prefer trade_timestamp
  trade_timestamp?: number // Actual API field
  side?: 'buy' | 'sell' // Legacy field, prefer type
  type?: string // Actual API field
}

export interface DexieHistoricalTradesResponse {
  success: boolean
  data: DexieHistoricalTrade[]
}

export interface DexieHistoricalTradesApiResponse {
  success: boolean
  ticker_id: string
  pool_id?: string
  timestamp?: number
  trades: DexieHistoricalTrade[]
}

export interface DexieOfferSearchParams {
  requested?: string
  offered?: string
  maker?: string
  page_size?: number
  page?: number
  status?: number
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
