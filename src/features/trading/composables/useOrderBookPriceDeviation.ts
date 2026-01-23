import { useMemo } from 'react'
import { calculateOrderPrice as calculateOrderPriceNumeric } from '../lib/services/priceCalculation'
import type { OrderBookFilters, OrderBookOrder } from '../lib/orderBookTypes'

interface UseOrderBookPriceDeviationOptions {
  hoveredOrder: OrderBookOrder | null
  filteredBuyOrders: OrderBookOrder[]
  filteredSellOrders: OrderBookOrder[]
  contextFilters: OrderBookFilters
  getTickerSymbol: (assetId: string, code?: string) => string
}

/**
 * Calculates price deviation percentage for hovered order
 * Compares the hovered order's price against the best price in its order list
 */
export function useOrderBookPriceDeviation({
  hoveredOrder,
  filteredBuyOrders,
  filteredSellOrders,
  contextFilters,
  getTickerSymbol,
}: UseOrderBookPriceDeviationOptions): number | null {
  return useMemo(() => {
    if (!hoveredOrder) return null

    // Determine which order list the hovered order belongs to
    const isBuyOrder = filteredBuyOrders.includes(hoveredOrder)
    const orderList = isBuyOrder ? filteredBuyOrders : filteredSellOrders
    const orderType = isBuyOrder ? 'buy' : 'sell'

    if (orderList.length === 0) return null

    // Calculate numeric price for all orders
    const getNumericPrice = (order: OrderBookOrder) => {
      return calculateOrderPriceNumeric(order, contextFilters, { getTickerSymbol })
    }

    // Calculate best price (lowest for sell, highest for buy)
    const prices = orderList.map(getNumericPrice).filter((p) => p > 0 && isFinite(p))
    if (prices.length === 0) return null

    const bestPrice =
      orderType === 'sell'
        ? Math.min(...prices) // Lowest price is best for sell
        : Math.max(...prices) // Highest price is best for buy

    if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return null

    // Calculate current price of hovered order
    const currentPrice = getNumericPrice(hoveredOrder)
    if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return null

    // If prices are exactly equal, return 0% deviation
    if (currentPrice === bestPrice) return 0

    // Calculate deviation percentage
    let deviation: number
    if (orderType === 'sell') {
      // For sell orders: ((currentPrice - bestPrice) / bestPrice) * 100
      deviation = ((currentPrice - bestPrice) / bestPrice) * 100
    } else {
      // For buy orders: ((bestPrice - currentPrice) / bestPrice) * 100
      deviation = ((bestPrice - currentPrice) / bestPrice) * 100
    }

    // Handle NaN or Infinity results
    if (!isFinite(deviation) || isNaN(deviation)) return null

    // Cap at 100% and ensure non-negative
    return Math.max(0, Math.min(100, deviation))
  }, [hoveredOrder, filteredBuyOrders, filteredSellOrders, contextFilters, getTickerSymbol])
}
