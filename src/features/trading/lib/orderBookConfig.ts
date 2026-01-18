import type { OrderBookPagination } from './orderBookTypes'

/**
 * Calculate refetch interval based on pagination
 */
export function calculateRefetchInterval(pagination: OrderBookPagination): number | false {
  const intervals: Record<OrderBookPagination, number | false> = {
    10: 10 * 1000, // 10 seconds
    15: 15 * 1000, // 15 seconds
    50: 30 * 1000, // 30 seconds
    100: 60 * 1000, // 60 seconds
    all: false, // No auto-refetch
  }
  return intervals[pagination]
}

/**
 * Calculate stale time based on pagination
 */
export function calculateStaleTime(pagination: OrderBookPagination): number {
  const staleTimes: Record<OrderBookPagination, number> = {
    10: 5 * 1000, // 5 seconds
    15: 5 * 1000, // 5 seconds
    50: 15 * 1000, // 15 seconds
    100: 30 * 1000, // 30 seconds
    all: 60 * 1000, // 60 seconds
  }
  return staleTimes[pagination]
}
