import type { OrderBookFilters, OrderBookOrder } from '../orderBookTypes'
import { assetMatchesFilter, type Asset } from '../utils/assetUtils'
import { hasSameAssetOnBothSides } from '../utils/orderValidation'

export interface FilterOptions {
  getTickerSymbol: (assetId: string, code?: string) => string
  areAssetsEqual: (asset1: Asset, asset2: Asset) => boolean
}

/**
 * Create a filter function for buy orders
 */
export function createBuyOrderFilter(
  filters: OrderBookFilters | undefined,
  options: FilterOptions
): (order: OrderBookOrder) => boolean {
  const hasBuyFilter = filters?.buyAsset && filters.buyAsset.length > 0
  const hasSellFilter = filters?.sellAsset && filters.sellAsset.length > 0

  return (order: OrderBookOrder) => {
    // Always exclude orders where the same asset appears on both sides
    if (hasSameAssetOnBothSides(order, options.areAssetsEqual)) {
      return false
    }

    // If both filters are set: buy side = offering buyAsset AND requesting sellAsset
    if (hasBuyFilter && hasSellFilter) {
      const allOfferingMatchBuyAsset = order.offering.every((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
      const allRequestingMatchSellAsset = order.requesting.every((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
      const hasOfferingBuyAsset = order.offering.some((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
      const hasRequestingSellAsset = order.requesting.some((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
      return (
        allOfferingMatchBuyAsset &&
        allRequestingMatchSellAsset &&
        hasOfferingBuyAsset &&
        hasRequestingSellAsset
      )
    }

    // If only buy filter: show all orders where buyAsset is on offering side
    if (hasBuyFilter && !hasSellFilter) {
      return order.offering.some((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
    }

    // If only sell filter: show all orders where sellAsset is on requesting side
    if (!hasBuyFilter && hasSellFilter) {
      return order.requesting.some((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
    }

    // No filters: show all orders
    return true
  }
}

/**
 * Create a filter function for sell orders
 */
export function createSellOrderFilter(
  filters: OrderBookFilters | undefined,
  options: FilterOptions
): (order: OrderBookOrder) => boolean {
  const hasBuyFilter = filters?.buyAsset && filters.buyAsset.length > 0
  const hasSellFilter = filters?.sellAsset && filters.sellAsset.length > 0

  return (order: OrderBookOrder) => {
    // Always exclude orders where the same asset appears on both sides
    if (hasSameAssetOnBothSides(order, options.areAssetsEqual)) {
      return false
    }

    // If both filters are set: sell side = offering sellAsset AND requesting buyAsset
    if (hasBuyFilter && hasSellFilter) {
      const allOfferingMatchSellAsset = order.offering.every((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
      const allRequestingMatchBuyAsset = order.requesting.every((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
      const hasOfferingSellAsset = order.offering.some((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
      const hasRequestingBuyAsset = order.requesting.some((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
      return (
        allOfferingMatchSellAsset &&
        allRequestingMatchBuyAsset &&
        hasOfferingSellAsset &&
        hasRequestingBuyAsset
      )
    }

    // If only buy filter: show all orders where buyAsset is on requesting side
    if (hasBuyFilter && !hasSellFilter) {
      return order.requesting.some((asset) =>
        assetMatchesFilter(asset, filters.buyAsset || [], options.getTickerSymbol)
      )
    }

    // If only sell filter: show all orders where sellAsset is on offering side
    if (!hasBuyFilter && hasSellFilter) {
      return order.offering.some((asset) =>
        assetMatchesFilter(asset, filters.sellAsset || [], options.getTickerSymbol)
      )
    }

    // No filters: show all orders
    return true
  }
}

/**
 * Filter and sort orders
 */
export function filterAndSortOrders(
  orders: OrderBookOrder[],
  filterFn: (order: OrderBookOrder) => boolean,
  sortAscending: boolean,
  calculatePriceFn: (order: OrderBookOrder) => number
): OrderBookOrder[] {
  return orders.filter(filterFn).sort((a, b) => {
    const priceA = calculatePriceFn(a)
    const priceB = calculatePriceFn(b)
    return sortAscending ? priceA - priceB : priceB - priceA
  })
}
