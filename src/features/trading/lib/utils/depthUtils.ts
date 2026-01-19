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
 * @returns Spread percentage, or 0 if either price is invalid
 */
export function calculateSpreadPercent(bestBid: number | null, bestAsk: number | null): number {
  if (!bestBid || !bestAsk || bestBid <= 0 || bestAsk <= 0) {
    return 0
  }
  const spread = bestAsk - bestBid
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
  const bidLevels = Array.from(bidMap.values())
    .sort((a, b) => b.price - a.price) // Descending (best bid first)
    .slice(0, maxLevels)

  const askLevels = Array.from(askMap.values())
    .sort((a, b) => a.price - b.price) // Ascending (best ask first)
    .slice(0, maxLevels)

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

  // Calculate spread
  const spread = bestBid && bestAsk ? bestAsk - bestBid : 0
  const spreadPercent = calculateSpreadPercent(bestBid, bestAsk)

  return {
    bids: bidDepthLevels,
    asks: askDepthLevels,
    bestBid,
    bestAsk,
    spread,
    spreadPercent,
  }
}
