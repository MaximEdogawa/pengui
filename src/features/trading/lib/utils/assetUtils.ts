import { getNativeTokenTicker } from '@/shared/lib/config/environment'

export interface Asset {
  id: string
  code?: string
}

/**
 * Get ticker symbol for an asset
 */
export function getTickerSymbol(
  assetId: string,
  code: string | undefined,
  getCatTokenInfo: (assetId: string) => { ticker?: string } | undefined
): string {
  if (code) return code
  if (!assetId) return getNativeTokenTicker()
  const tickerInfo = getCatTokenInfo(assetId)
  return tickerInfo?.ticker || assetId.slice(0, 8)
}

/**
 * Check if an asset is the native token (XCH/TXCH)
 */
export function isNativeToken(
  asset: Asset,
  getTickerSymbolFn: (assetId: string, code?: string) => string
): boolean {
  const ticker = getTickerSymbolFn(asset.id, asset.code)
  const nativeTicker = getNativeTokenTicker()
  // Check if it's XCH, TXCH, or the native token for current network
  return (
    ticker.toUpperCase() === 'XCH' ||
    ticker.toUpperCase() === 'TXCH' ||
    ticker.toUpperCase() === nativeTicker.toUpperCase() ||
    asset.id === '' ||
    asset.id.toLowerCase() === 'xch' ||
    asset.id.toLowerCase() === 'txch'
  )
}

/**
 * Check if an asset matches any of the filter assets
 */
export function assetMatchesFilter(
  asset: Asset,
  filterAssets: string[],
  getTickerSymbolFn: (assetId: string, code?: string) => string
): boolean {
  if (!filterAssets || filterAssets.length === 0) return false
  return filterAssets.some((filterAsset) => {
    const assetTicker = getTickerSymbolFn(asset.id, asset.code)
    return (
      assetTicker.toLowerCase() === filterAsset.toLowerCase() ||
      asset.id.toLowerCase() === filterAsset.toLowerCase() ||
      (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
    )
  })
}

/**
 * Check if two assets are the same
 */
export function areAssetsEqual(
  asset1: Asset,
  asset2: Asset,
  getTickerSymbolFn: (assetId: string, code?: string) => string,
  isNativeTokenFn: (asset: Asset) => boolean
): boolean {
  const ticker1 = getTickerSymbolFn(asset1.id, asset1.code)
  const ticker2 = getTickerSymbolFn(asset2.id, asset2.code)

  // Check if tickers match
  if (ticker1.toLowerCase() === ticker2.toLowerCase()) {
    return true
  }

  // Check if asset IDs match
  if (asset1.id.toLowerCase() === asset2.id.toLowerCase()) {
    return true
  }

  // Check if codes match
  if (asset1.code && asset2.code && asset1.code.toLowerCase() === asset2.code.toLowerCase()) {
    return true
  }

  // Special case: Check if both are native tokens (XCH/TXCH are the same)
  if (isNativeTokenFn(asset1) && isNativeTokenFn(asset2)) {
    return true
  }

  return false
}
