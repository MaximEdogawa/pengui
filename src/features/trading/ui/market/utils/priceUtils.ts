import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import type { OrderBookFilters, OrderBookOrder } from '../../../lib/orderBookTypes'
import { calculateOrderPrice as calculateOrderPriceNumeric } from '../../../lib/services/priceCalculation'

/**
 * Calculate order type (buy/sell) from taker's perspective
 */
export function calculateOrderType(
  order: OrderBookOrder | undefined,
  filters: OrderBookFilters | undefined,
  network: 'mainnet' | 'testnet',
  getCatTokenInfo: (assetId: string) => { ticker?: string } | undefined
): 'buy' | 'sell' | null {
  if (!order || !filters?.buyAsset || !filters?.sellAsset) return null
  const buyAssets = filters.buyAsset || []
  const sellAssets = filters.sellAsset || []
  if (buyAssets.length === 0 || sellAssets.length === 0) return null

  const getTickerSymbol = (assetId: string, code?: string): string => {
    if (code) return code
    if (!assetId) return getNativeTokenTickerForNetwork(network)
    const tickerInfo = getCatTokenInfo(assetId)
    return tickerInfo?.ticker || assetId.slice(0, 8)
  }

  const requestingIsBuyAsset = order.requesting.some((asset) =>
    buyAssets.some(
      (filterAsset) =>
        getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
        asset.id.toLowerCase() === filterAsset.toLowerCase() ||
        (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
    )
  )

  const offeringIsBuyAsset = order.offering.some((asset) =>
    buyAssets.some(
      (filterAsset) =>
        getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
        asset.id.toLowerCase() === filterAsset.toLowerCase() ||
        (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
    )
  )

  if (requestingIsBuyAsset && !offeringIsBuyAsset) return 'sell'
  if (offeringIsBuyAsset && !requestingIsBuyAsset) return 'buy'
  return null
}

/**
 * Calculate price deviation percentage
 */
export function calculatePriceDeviation(params: {
  order: OrderBookOrder | undefined
  filteredBuyOrders: OrderBookOrder[]
  filteredSellOrders: OrderBookOrder[]
  filters: OrderBookFilters | undefined
  getTickerSymbol: (assetId: string, code?: string) => string
}): number | null {
  const { order, filteredBuyOrders, filteredSellOrders, filters, getTickerSymbol } = params
  if (!order) return null
  const isBuyOrder = filteredBuyOrders.some((o) => o.id === order.id)
  const orderList = isBuyOrder ? filteredBuyOrders : filteredSellOrders
  const orderTypeForPrice = isBuyOrder ? 'buy' : 'sell'
  if (orderList.length === 0) return null

  const getNumericPrice = (o: OrderBookOrder) =>
    calculateOrderPriceNumeric(o, filters, { getTickerSymbol })
  const prices = orderList.map(getNumericPrice).filter((p) => p > 0 && isFinite(p))
  if (prices.length === 0) return null

  const bestPrice = orderTypeForPrice === 'sell' ? Math.min(...prices) : Math.max(...prices)
  if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return null

  const currentPrice = getNumericPrice(order)
  if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return null
  if (currentPrice === bestPrice) return 0

  const deviation =
    orderTypeForPrice === 'sell'
      ? ((currentPrice - bestPrice) / bestPrice) * 100
      : ((bestPrice - currentPrice) / bestPrice) * 100

  if (!isFinite(deviation) || isNaN(deviation)) return null
  return Math.max(0, Math.min(100, deviation))
}
