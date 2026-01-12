'use client'

import { environment } from '@/shared/lib/config/environment'
import { CHIA_ASSET_IDS, XCH_BASE_CURRENCIES } from '@/shared/lib/constants/chia-assets'
import type { DexieTicker } from '@/features/offers/lib/dexieTypes'
import type { Asset, Ticker } from '@/entities/asset'
import { tickerToAsset } from '@/entities/asset'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

const DEXIE_KEY = 'dexie'
const TICKERS_KEY = 'tickers'
const DEXIE_API_BASE_URL = environment.dexie.apiBaseUrl

/**
 * @deprecated Use Asset type from @/types/asset.types instead
 * Kept for backward compatibility
 */
export interface CatTokenInfo {
  assetId: string
  ticker: string
  name: string
  symbol: string
}

/**
 * Convert DexieTicker to Ticker format
 */
export function dexieTickerToTicker(dexieTicker: DexieTicker): Ticker {
  return {
    tickerId: dexieTicker.ticker_id,
    baseCurrency: dexieTicker.base_currency,
    targetCurrency: dexieTicker.target_currency,
    baseCode: dexieTicker.base_code,
    targetCode: dexieTicker.target_code,
    baseName: dexieTicker.base_name,
    targetName: dexieTicker.target_name,
    lastPrice: dexieTicker.last_price,
    currentAvgPrice: dexieTicker.current_avg_price,
    baseVolume: dexieTicker.base_volume,
    targetVolume: dexieTicker.target_volume,
    poolId: dexieTicker.pool_id,
    bid: dexieTicker.bid,
    ask: dexieTicker.ask,
    high: dexieTicker.high,
    low: dexieTicker.low,
  }
}

/**
 * Create a map of CAT tokens from ticker data
 * Maps asset IDs to Asset information
 * Includes ALL tickers dynamically (not just those paired with XCH)
 */
export function createCatTokenMap(tickers: DexieTicker[]): Map<string, CatTokenInfo> {
  const catMap = new Map<string, CatTokenInfo>()

  // Only exclude pure XCH (not tokens that use XCH asset ID like TDBX)
  // We exclude base_currency that is exactly 'xch' or 'TXCH' (string match)
  // But we include tokens like TDBX that use the TXCH asset ID as their base_currency
  const xchBaseCurrencies = XCH_BASE_CURRENCIES

  tickers.forEach((dexieTicker) => {
    // Include ALL tickers where base_currency is not exactly 'xch' or 'TXCH'
    // This includes tokens like TDBX that use the TXCH asset ID
    const isNotXchBase = !xchBaseCurrencies.has(dexieTicker.base_currency)

    if (isNotXchBase && dexieTicker.base_currency) {
      // Map asset ID (base_currency) to asset information
      // Use the most recent ticker data if duplicate asset IDs exist
      catMap.set(dexieTicker.base_currency, {
        assetId: dexieTicker.base_currency, // This is the actual asset ID
        ticker: dexieTicker.base_code,
        name: dexieTicker.base_name,
        symbol: dexieTicker.base_code,
      })
    }
  })

  return catMap
}

/**
 * Create a map of assets from ticker data
 * Returns Map<assetId, Asset> for easy lookup
 * Includes ALL tickers dynamically (not just those paired with XCH)
 */
export function createAssetMap(tickers: DexieTicker[]): Map<string, Asset> {
  const assetMap = new Map<string, Asset>()

  // Only exclude pure XCH (not tokens that use XCH asset ID like TDBX)
  // We exclude base_currency that is exactly 'xch' or 'TXCH' (string match)
  // But we include tokens like TDBX that use the TXCH asset ID as their base_currency
  const xchBaseCurrencies = XCH_BASE_CURRENCIES

  tickers.forEach((dexieTicker) => {
    // Include ALL tickers where base_currency is not exactly 'xch' or 'TXCH'
    // This includes tokens like TDBX that use the TXCH asset ID
    const isNotXchBase = !xchBaseCurrencies.has(dexieTicker.base_currency)

    if (isNotXchBase && dexieTicker.base_currency) {
      const ticker = dexieTickerToTicker(dexieTicker)
      const asset = tickerToAsset(ticker)
      // Map asset ID (base_currency) to Asset
      // Use the most recent ticker data if duplicate asset IDs exist
      assetMap.set(dexieTicker.base_currency, asset)
    }
  })

  return assetMap
}

/**
 * Get CAT token info from a map
 */
export function getCatTokenInfo(assetId: string, catMap: Map<string, CatTokenInfo>): CatTokenInfo {
  return (
    catMap.get(assetId) || {
      assetId,
      ticker: assetId,
      name: assetId,
      symbol: assetId,
    }
  )
}

/**
 * Hook to fetch all tickers from Dexie API using TanStack Query
 */
export function useTickers() {
  return useQuery({
    queryKey: [DEXIE_KEY, TICKERS_KEY],
    queryFn: async () => {
      const response = await fetch(`${DEXIE_API_BASE_URL}/v3/prices/tickers`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const tickersArray = Array.isArray(data.json)
        ? data.json
        : Array.isArray(data.tickers)
          ? data.tickers
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []

      return {
        success: true,
        data: tickersArray,
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Hook to get processed CAT token data from tickers
 * Returns both legacy CatTokenInfo format and new Asset format
 */
export function useCatTokens() {
  const tickersQuery = useTickers()

  // Legacy map for backward compatibility
  const catTokenMap = useMemo(() => {
    const map = new Map<string, CatTokenInfo>()

    // Process tickers if available
    if (tickersQuery.data?.success && tickersQuery.data.data) {
      const processedMap = createCatTokenMap(tickersQuery.data.data)
      processedMap.forEach((value, key) => {
        map.set(key, value)
      })
    }

    return map
  }, [tickersQuery.data])

  // New asset map using proper types
  const assetMap = useMemo(() => {
    const map = new Map<string, Asset>()

    // Process tickers if available
    if (tickersQuery.data?.success && tickersQuery.data.data) {
      const processedMap = createAssetMap(tickersQuery.data.data)
      processedMap.forEach((value, key) => {
        map.set(key, value)
      })
    }

    return map
  }, [tickersQuery.data])

  // Create available tokens list (legacy format for backward compatibility)
  // Include XCH in the list
  const availableCatTokens = useMemo(() => {
    const tokens = Array.from(catTokenMap.values())
    // Add XCH to the list
    tokens.unshift({
      assetId: CHIA_ASSET_IDS.XCH, // Empty string for XCH (as per wallet requirements)
      ticker: 'XCH',
      name: 'Chia',
      symbol: 'XCH',
    })
    return tokens.sort((a, b) => {
      // XCH always first
      if (a.ticker === 'XCH') return -1
      if (b.ticker === 'XCH') return 1
      return a.ticker.localeCompare(b.ticker)
    })
  }, [catTokenMap])

  // Create available assets list (new format)
  // Include XCH in the list
  const availableAssets = useMemo(() => {
    const assets = Array.from(assetMap.values())
    // Add XCH to the list
    assets.unshift({
      assetId: CHIA_ASSET_IDS.XCH, // Empty string for XCH (as per wallet requirements)
      ticker: 'XCH',
      name: 'Chia',
      symbol: 'XCH',
      type: 'xch',
    })
    return assets.sort((a, b) => {
      // XCH always first
      if (a.ticker === 'XCH') return -1
      if (b.ticker === 'XCH') return 1
      return a.ticker.localeCompare(b.ticker)
    })
  }, [assetMap])

  return {
    // Legacy format (backward compatibility)
    catTokenMap,
    availableCatTokens,

    // New format (recommended)
    assetMap,
    availableAssets,

    // Raw tickers data
    tickers: tickersQuery.data?.data || [],

    // Loading states
    isLoading: tickersQuery.isLoading,
    isError: tickersQuery.isError,
    error: tickersQuery.error,
    refetch: tickersQuery.refetch,

    // Helper to get token info synchronously (legacy)
    getCatTokenInfo: (assetId: string) => getCatTokenInfo(assetId, catTokenMap),

    // Helper to get asset info synchronously (new)
    getAsset: (assetId: string): Asset | undefined => assetMap.get(assetId),
  }
}

/**
 * Get CAT token info for a specific asset ID (non-hook version for use in callbacks)
 */
export function getCatTokenInfoSync(
  assetId: string,
  catTokenMap: Map<string, CatTokenInfo>
): CatTokenInfo {
  return getCatTokenInfo(assetId, catTokenMap)
}
