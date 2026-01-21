import type { OrderBookChartData, MarketDepthLevel, MarketDepthData } from '../chartTypes'

/**
 * Normalize price to a specific precision for grouping orders by price level
 * @param price - The price to normalize
 * @param precision - Number of decimal places (default: 8)
 * @returns Normalized price as a number
 */
export function normalizePriceLevel(price: number, precision: number = 8): number {
  if (!isFinite(price) || isNaN(price) || price <= 0) {
    return 0
  }
  const multiplier = Math.pow(10, precision)
  return Math.round(price * multiplier) / multiplier
}

/**
 * Calculate spread percentage between best bid and best ask
 * @param bestBid - Best bid price
 * @param bestAsk - Best ask price
 * @returns Spread percentage (always positive), or 0 if either price is invalid
 */
export function calculateSpreadPercent(bestBid: number | null, bestAsk: number | null): number {
  if (!bestBid || !bestAsk || bestBid <= 0 || bestAsk <= 0) {
    return 0
  }
  const spread = Math.abs(bestAsk - bestBid)
  const midPrice = (bestBid + bestAsk) / 2
  return midPrice > 0 ? (spread / midPrice) * 100 : 0
}

/**
 * Aggregate orders by price level and calculate cumulative volume
 * @param orderBookData - Order book data with bids and asks
 * @param maxLevels - Maximum number of price levels to return (default: 30)
 * @param pricePrecision - Precision for price grouping (default: 8)
 * @returns Market depth data with aggregated price levels
 */
export function aggregateDepthByPriceLevel(
  orderBookData: OrderBookChartData,
  maxLevels: number = 30,
  pricePrecision: number = 8
): MarketDepthData {
  const { bids, asks, bestBid, bestAsk } = orderBookData

  // Aggregate bids by price level (descending order)
  const bidMap = new Map<string, { price: number; volume: number; count: number }>()
  
  bids.forEach((bid) => {
    const normalizedPrice = normalizePriceLevel(bid.price, pricePrecision)
    const priceKey = normalizedPrice.toFixed(pricePrecision)
    
    if (bidMap.has(priceKey)) {
      const existing = bidMap.get(priceKey)!
      existing.volume += bid.volume
      existing.count += 1
    } else {
      bidMap.set(priceKey, {
        price: normalizedPrice,
        volume: bid.volume,
        count: 1,
      })
    }
  })

  // Aggregate asks by price level (ascending order)
  const askMap = new Map<string, { price: number; volume: number; count: number }>()
  
  asks.forEach((ask) => {
    const normalizedPrice = normalizePriceLevel(ask.price, pricePrecision)
    const priceKey = normalizedPrice.toFixed(pricePrecision)
    
    if (askMap.has(priceKey)) {
      const existing = askMap.get(priceKey)!
      existing.volume += ask.volume
      existing.count += 1
    } else {
      askMap.set(priceKey, {
        price: normalizedPrice,
        volume: ask.volume,
        count: 1,
      })
    }
  })

  // Convert to arrays and sort
  const allBidLevels = Array.from(bidMap.values())
    .sort((a, b) => b.price - a.price) // Descending (best bid first)

  const allAskLevels = Array.from(askMap.values())
    .sort((a, b) => a.price - b.price) // Ascending (best ask first)

  // Track excluded orders - only exclude when spread is negative (bestBid > bestAsk)
  let excludedBids: Array<{ price: number; volume: number; count: number }> = []
  let excludedAsks: Array<{ price: number; volume: number; count: number }> = []

  let bidLevels = allBidLevels
  let askLevels = allAskLevels

  // Only exclude when spread is negative (bestBid > bestAsk)
  // This is an invalid market state where bids overlap with asks
  if (bestBid && bestAsk && bestBid > bestAsk) {
    // Exclude asks that are <= bestBid (invalid overlapping asks)
    excludedAsks = askLevels.filter((ask) => ask.price <= bestBid)
    askLevels = askLevels.filter((ask) => ask.price > bestBid)

    // Exclude bids that are >= bestAsk (invalid overlapping bids)
    excludedBids = bidLevels.filter((bid) => bid.price >= bestAsk)
    bidLevels = bidLevels.filter((bid) => bid.price < bestAsk)
  }

  bidLevels = bidLevels.slice(0, maxLevels)
  askLevels = askLevels.slice(0, maxLevels)

  // Calculate cumulative volume
  // For bids: accumulate from best bid downward
  let cumulativeBidVolume = 0
  const bidDepthLevels: MarketDepthLevel[] = bidLevels.map((level) => {
    cumulativeBidVolume += level.volume
    return {
      price: level.price,
      quantity: level.volume,
      cumulativeVolume: cumulativeBidVolume,
      orderCount: level.count,
    }
  })

  // For asks: accumulate from best ask upward
  let cumulativeAskVolume = 0
  const askDepthLevels: MarketDepthLevel[] = askLevels.map((level) => {
    cumulativeAskVolume += level.volume
    return {
      price: level.price,
      quantity: level.volume,
      cumulativeVolume: cumulativeAskVolume,
      orderCount: level.count,
    }
  })

  // Update valid best bid/ask when spread is negative (bestBid > bestAsk)
  let validBestAsk = bestAsk
  let validBestBid = bestBid
  if (bestBid && bestAsk && bestBid > bestAsk) {
    // Find the first ask that is higher than best bid (after filtering)
    const firstValidAsk = askDepthLevels.find((ask) => ask.price > bestBid)
    validBestAsk = firstValidAsk ? firstValidAsk.price : null

    // Find the first bid that is lower than best ask (after filtering)
    const firstValidBid = bidDepthLevels.find((bid) => bid.price < bestAsk)
    validBestBid = firstValidBid ? firstValidBid.price : null
  }

  // Calculate spread (always positive)
  const spread = validBestBid && validBestAsk ? Math.abs(validBestAsk - validBestBid) : 0
  const spreadPercent = calculateSpreadPercent(validBestBid, validBestAsk)

  // Convert excluded orders to MarketDepthLevel format
  const excludedBidLevels: MarketDepthLevel[] = excludedBids.map((level) => ({
    price: level.price,
    quantity: level.volume,
    cumulativeVolume: 0, // Not calculated for excluded orders
    orderCount: level.count,
  }))

  const excludedAskLevels: MarketDepthLevel[] = excludedAsks.map((level) => ({
    price: level.price,
    quantity: level.volume,
    cumulativeVolume: 0, // Not calculated for excluded orders
    orderCount: level.count,
  }))

  return {
    bids: bidDepthLevels,
    asks: askDepthLevels,
    bestBid: validBestBid,
    bestAsk: validBestAsk,
    spread,
    spreadPercent,
    excludedBids: excludedBidLevels.length > 0 ? excludedBidLevels : undefined,
    excludedAsks: excludedAskLevels.length > 0 ? excludedAskLevels : undefined,
  }
}
