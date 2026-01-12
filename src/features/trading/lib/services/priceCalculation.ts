import type { OrderBookOrder, OrderBookFilters } from '../orderBookTypes'

export interface PriceCalculationOptions {
  getTickerSymbol: (assetId: string, code?: string) => string
}

/**
 * Calculate price for an order from buy side perspective: buyAsset/sellAsset
 */
export function calculateOrderPrice(
  order: OrderBookOrder,
  filters: OrderBookFilters | undefined,
  options: PriceCalculationOptions
): number {
  if (
    !filters?.buyAsset ||
    filters.buyAsset.length === 0 ||
    !filters?.sellAsset ||
    filters.sellAsset.length === 0
  ) {
    return order.pricePerUnit
  }

  // For single asset pairs, calculate price as buyAsset/sellAsset
  if (order.offering.length === 1 && order.requesting.length === 1) {
    const requestingAsset = order.requesting[0]
    const offeringAsset = order.offering[0]

    if (
      requestingAsset &&
      offeringAsset &&
      requestingAsset.amount > 0 &&
      offeringAsset.amount > 0
    ) {
      // Determine which asset is the buy asset and which is the sell asset
      const requestingIsBuyAsset = filters.buyAsset.some(
        (filterAsset) =>
          options.getTickerSymbol(requestingAsset.id, requestingAsset.code).toLowerCase() ===
            filterAsset.toLowerCase() ||
          requestingAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (requestingAsset.code && requestingAsset.code.toLowerCase() === filterAsset.toLowerCase())
      )

      const offeringIsBuyAsset = filters.buyAsset.some(
        (filterAsset) =>
          options.getTickerSymbol(offeringAsset.id, offeringAsset.code).toLowerCase() ===
            filterAsset.toLowerCase() ||
          offeringAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (offeringAsset.code && offeringAsset.code.toLowerCase() === filterAsset.toLowerCase())
      )

      // Calculate price from buy side: buyAsset amount / sellAsset amount
      if (requestingIsBuyAsset && !offeringIsBuyAsset) {
        return requestingAsset.amount / offeringAsset.amount
      } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
        return offeringAsset.amount / requestingAsset.amount
      }
    }
  }

  // Fallback to pricePerUnit for multi-asset pairs or when calculation fails
  return order.pricePerUnit
}

/**
 * Calculate average market price from best buy and sell orders
 */
export function calculateAveragePrice(
  bestSellOrder: OrderBookOrder | undefined,
  bestBuyOrder: OrderBookOrder | undefined,
  calculatePriceFn: (order: OrderBookOrder) => number,
  formatPriceFn: (price: number) => string
): string {
  const bestSellPrice = bestSellOrder ? calculatePriceFn(bestSellOrder) : 0
  const bestBuyPrice = bestBuyOrder ? calculatePriceFn(bestBuyOrder) : 0

  // Calculate average (middle price) if both prices exist
  if (bestSellPrice > 0 && bestBuyPrice > 0) {
    const averagePrice = (bestSellPrice + bestBuyPrice) / 2
    return formatPriceFn(averagePrice)
  }

  // Fallback to individual prices if only one exists
  if (bestSellPrice > 0) {
    return formatPriceFn(bestSellPrice)
  }
  if (bestBuyPrice > 0) {
    return formatPriceFn(bestBuyPrice)
  }

  return 'N/A'
}
