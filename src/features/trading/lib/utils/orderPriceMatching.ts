import type { OrderBookOrder } from '../orderBookTypes'
import { normalizePriceLevel } from './depthUtils'
import { logger } from '@/shared/lib/logger'

/**
 * Find an order matching a specific price level
 * @param price - The target price to match
 * @param orders - Array of orders to search (pre-filtered by caller)
 * @param calculatePriceFn - Function to calculate price from an order
 * @returns The first matching order, or null if not found
 */
export function findOrderByPrice(
  price: number,
  orders: OrderBookOrder[],
  calculatePriceFn?: (order: OrderBookOrder) => number
): OrderBookOrder | null {
  if (!calculatePriceFn) {
    logger.warn('findOrderByPrice: calculatePriceFn not available')
    return null
  }

  const normalizedTargetPrice = normalizePriceLevel(price, 8)
  const matchingOrders: OrderBookOrder[] = []

  for (const order of orders) {
    try {
      const orderPrice = calculatePriceFn(order)
      const normalizedOrderPrice = normalizePriceLevel(orderPrice, 8)
      const diff = Math.abs(normalizedOrderPrice - normalizedTargetPrice)
      
      if (diff < 0.00000001) {
        matchingOrders.push(order)
      }
    } catch (error) {
      logger.warn('findOrderByPrice: Error calculating price', error)
    }
  }

  if (matchingOrders.length > 0) {
    return matchingOrders[0]
  }

  logger.warn(`findOrderByPrice: No order found at price ${price}`)
  return null
}
