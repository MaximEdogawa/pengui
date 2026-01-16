import { useMemo } from 'react'
import { useCatTokens } from '@/shared/hooks'
import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { useNetwork } from '@/shared/hooks/useNetwork'
import type { OrderBookFilters, OrderBookOrder } from '../../../../lib/orderBookTypes'

/**
 * Extract order type detection logic to reduce complexity
 */
export function useOrderType(
  order: OrderBookOrder | undefined,
  filters: OrderBookFilters | undefined
): 'buy' | 'sell' | null {
  const { network } = useNetwork()
  const { getCatTokenInfo } = useCatTokens()

  return useMemo(() => {
    if (!order || !filters?.buyAsset || !filters?.sellAsset) {
      return null
    }

    const buyAssets = filters.buyAsset || []
    const sellAssets = filters.sellAsset || []

    if (buyAssets.length === 0 || sellAssets.length === 0) {
      return null
    }

    // Helper to get ticker symbol
    const getTickerSymbol = (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTickerForNetwork(network)
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    }

    // Check if requesting side matches buy asset
    const requestingIsBuyAsset = order.requesting.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // Check if offering side matches buy asset
    const offeringIsBuyAsset = order.offering.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // From maker's perspective (Limit tab):
    // If maker is requesting buyAsset, maker is SELLING buyAsset
    // If maker is offering buyAsset, maker is BUYING buyAsset
    if (requestingIsBuyAsset && !offeringIsBuyAsset) {
      return 'sell' // Maker is requesting buyAsset, so maker is selling it
    } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
      return 'buy' // Maker is offering buyAsset, so maker is buying it
    }

    return null
  }, [
    order,
    filters?.buyAsset,
    filters?.sellAsset,
    getCatTokenInfo,
    network,
  ])
}
