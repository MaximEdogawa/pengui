import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import type { OrderBookFilters } from './orderBookTypes'

/**
 * Normalize ticker for API (XCH -> TXCH on testnet, etc.)
 */
export function normalizeTickerForApi(ticker: string, network: 'mainnet' | 'testnet'): string {
  const nativeTicker = getNativeTokenTickerForNetwork(network)
  // If the ticker is XCH or TXCH, normalize to the correct native token for the network
  if (ticker.toUpperCase() === 'XCH' || ticker.toUpperCase() === 'TXCH') {
    return nativeTicker
  }
  // Return ticker as-is for other assets
  return ticker
}

/**
 * Build search parameters based on filters
 */
export interface BuildOrderBookSearchParamsOptions {
  page: number
  pagination: number | 'all'
  network: 'mainnet' | 'testnet'
  buyAsset?: string | null
  sellAsset?: string | null
  filters?: OrderBookFilters
  pageSize?: number
}

export function buildOrderBookSearchParams({
  page,
  pagination,
  network,
  buyAsset,
  sellAsset,
  filters,
  pageSize,
}: BuildOrderBookSearchParamsOptions) {
  const params: {
    page: number
    page_size: number
    status: number
    requested?: string
    offered?: string
  } = {
    page,
    page_size: pageSize || (pagination === 'all' ? 100 : pagination),
    status: 0, // Only open offers
  }

  // Use provided parameters or fall back to filters
  // If explicitly passed as null, don't use filters (treat as "don't use this parameter")
  // If undefined, use filter if available
  let targetBuyAsset: string | undefined
  if (buyAsset === null) {
    // Explicitly null: don't use this parameter
    targetBuyAsset = undefined
  } else if (buyAsset !== undefined) {
    // Explicitly provided value
    targetBuyAsset = buyAsset
  } else {
    // Undefined: use filter if available
    targetBuyAsset = filters?.buyAsset?.[0]
  }

  let targetSellAsset: string | undefined
  if (sellAsset === null) {
    // Explicitly null: don't use this parameter
    targetSellAsset = undefined
  } else if (sellAsset !== undefined) {
    // Explicitly provided value
    targetSellAsset = sellAsset
  } else {
    // Undefined: use filter if available
    targetSellAsset = filters?.sellAsset?.[0]
  }

  // Normalize tickers for API (XCH -> TXCH on testnet, etc.)
  if (targetBuyAsset) {
    targetBuyAsset = normalizeTickerForApi(targetBuyAsset, network)
  }
  if (targetSellAsset) {
    targetSellAsset = normalizeTickerForApi(targetSellAsset, network)
  }

  // For buy/sell filtering, we need to determine which asset is being bought/sold
  // If user wants to buy an asset (buyAsset), they're looking for offers where that asset is requested
  // If user wants to sell an asset (sellAsset), they're looking for offers where that asset is offered

  if (targetBuyAsset && !targetSellAsset) {
    // Only buyAsset: user wants to buy, so look for offers where the asset is requested
    params.requested = targetBuyAsset
  } else if (targetSellAsset && !targetBuyAsset) {
    // Only sellAsset: user wants to sell, so look for offers where the asset is offered
    params.offered = targetSellAsset
  } else if (targetBuyAsset && targetSellAsset) {
    // Both filters set: user wants to buy buyAsset and sell sellAsset
    // Look for offers where buyAsset is requested and sellAsset is offered
    params.requested = targetBuyAsset
    params.offered = targetSellAsset
  }

  return params
}
