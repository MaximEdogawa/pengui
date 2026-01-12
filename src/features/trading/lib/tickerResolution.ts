import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import type { DexieTicker } from '@/features/offers/lib/dexieTypes'
import type { OrderBookFilters } from './orderBookTypes'

function normalizeAssetForMatching(asset: string): string {
  const lower = asset.toLowerCase().trim()
  if (!lower || lower === 'xch' || lower === 'txch') {
    return 'xch'
  }
  return lower
}

function assetMatchesTickerField(
  asset: string,
  currency: string | undefined,
  code: string | undefined
): boolean {
  if (!asset) return false
  
  const normalizedAsset = normalizeAssetForMatching(asset)
  const normalizedCurrency = currency?.toLowerCase().trim()
  const normalizedCode = code?.toLowerCase().trim()
  
  if (normalizedCurrency === normalizedAsset || normalizedCode === normalizedAsset) {
    return true
  }
  
  if (normalizedAsset === 'xch' || normalizedAsset === 'txch') {
    return (
      normalizedCurrency === 'xch' ||
      normalizedCurrency === 'txch' ||
      normalizedCode === 'xch' ||
      normalizedCode === 'txch' ||
      normalizedCurrency === CHIA_ASSET_IDS.TXCH.toLowerCase() ||
      normalizedCurrency === CHIA_ASSET_IDS.XCH.toLowerCase()
    )
  }
  
  if (normalizedCurrency?.includes(normalizedAsset) || normalizedCode?.includes(normalizedAsset)) {
    return true
  }
  
  return false
}

function constructTickerId(baseCurrency: string, targetCurrency: string = 'xch'): string {
  return `${baseCurrency}_${normalizeAssetForMatching(targetCurrency)}`
}
export function resolveTickerId(
  filters: OrderBookFilters | undefined,
  tickers: DexieTicker[]
): string | null {
  if (!filters?.buyAsset?.length || !filters?.sellAsset?.length) {
    return null
  }

  const buyAssetFilter = filters.buyAsset[0]
  const sellAssetFilter = filters.sellAsset[0]

  if (!buyAssetFilter || !sellAssetFilter) {
    return null
  }

  for (const ticker of tickers) {
    const buyMatchesBase = assetMatchesTickerField(
      buyAssetFilter,
      ticker.base_currency,
      ticker.base_code
    )
    const sellMatchesTarget = assetMatchesTickerField(
      sellAssetFilter,
      ticker.target_currency,
      ticker.target_code
    )

    if (buyMatchesBase && sellMatchesTarget) {
      return ticker.ticker_id
    }

    const sellMatchesBase = assetMatchesTickerField(
      sellAssetFilter,
      ticker.base_currency,
      ticker.base_code
    )
    const buyMatchesTarget = assetMatchesTickerField(
      buyAssetFilter,
      ticker.target_currency,
      ticker.target_code
    )

    if (sellMatchesBase && buyMatchesTarget) {
      return ticker.ticker_id
    }
  }

  const buyIsNative = normalizeAssetForMatching(buyAssetFilter) === 'xch' || 
                      normalizeAssetForMatching(buyAssetFilter) === 'txch'
  const sellIsNative = normalizeAssetForMatching(sellAssetFilter) === 'xch' || 
                       normalizeAssetForMatching(sellAssetFilter) === 'txch'

  if (buyIsNative && !sellIsNative) {
    return constructTickerId(sellAssetFilter)
  }

  if (sellIsNative && !buyIsNative) {
    return constructTickerId(buyAssetFilter)
  }

  return null
}

export function getTickerById(tickerId: string, tickers: DexieTicker[]): DexieTicker | null {
  return tickers.find((t) => t.ticker_id === tickerId) || null
}
