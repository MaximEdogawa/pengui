import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import type { OrderBookOrder } from './orderBookTypes'

/**
 * Determine if an order is a sell order (offering native token)
 */
export function isSellOrder(order: OrderBookOrder, network: 'mainnet' | 'testnet'): boolean {
  const nativeTicker = getNativeTokenTickerForNetwork(network)
  return order.offering.some(
    (asset) => asset.code === nativeTicker || asset.code === 'TXCH' || asset.code === 'XCH'
  )
}

/**
 * Sort orders by price
 * Sell orders: sort by price descending (high to low)
 * Buy orders: sort by price ascending (low to high)
 */
export function sortOrdersByPrice(
  orders: OrderBookOrder[],
  network: 'mainnet' | 'testnet'
): OrderBookOrder[] {
  return orders.sort((a, b) => {
    const aIsSell = isSellOrder(a, network)
    const bIsSell = isSellOrder(b, network)

    // Sell orders: sort by price descending (high to low)
    if (aIsSell && bIsSell) {
      return b.pricePerUnit - a.pricePerUnit
    }

    // Buy orders: sort by price ascending (low to high)
    if (!aIsSell && !bIsSell) {
      return a.pricePerUnit - b.pricePerUnit
    }

    // Mixed order types: sell orders first, then buy orders
    return aIsSell ? -1 : 1
  })
}

/**
 * Deduplicate orders by ID
 */
export function deduplicateOrders(orders: OrderBookOrder[]): OrderBookOrder[] {
  const uniqueOrdersMap = new Map<string, OrderBookOrder>()
  orders.forEach((order) => {
    if (!uniqueOrdersMap.has(order.id)) {
      uniqueOrdersMap.set(order.id, order)
    }
  })
  return Array.from(uniqueOrdersMap.values())
}
