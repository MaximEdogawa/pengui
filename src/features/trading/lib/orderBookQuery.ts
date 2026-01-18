import { logger } from '@/shared/lib/logger'
import type { DexieOffer } from '@/entities/offer'
import type { OrderBookFilters, OrderBookOrder, OrderBookPagination } from './orderBookTypes'
import {
  fetchBidirectionalPair,
  fetchSingleFilter,
  fetchAllOrders,
  type BidirectionalPairConfig,
  type SingleFilterConfig,
  type AllOrdersConfig,
  type DexieSearchOffers,
} from '../model/orderBookQueryHelpers'
import { deduplicateOrders, sortOrdersByPrice } from './orderBookSorting'

/**
 * Determine which fetch strategy to use based on filters
 */
function determineFetchStrategy(filters?: OrderBookFilters): 'bidirectional' | 'single' | 'all' {
  if (
    filters?.buyAsset &&
    filters.buyAsset.length > 0 &&
    filters?.sellAsset &&
    filters.sellAsset.length > 0
  ) {
    return 'bidirectional'
  }

  if (
    (filters?.buyAsset && filters.buyAsset.length > 0) ||
    (filters?.sellAsset && filters.sellAsset.length > 0)
  ) {
    return 'single'
  }

  return 'all'
}

/**
 * Execute bidirectional pair fetch
 */
async function executeBidirectionalFetch(
  config: BidirectionalPairConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  return fetchBidirectionalPair(config)
}

/**
 * Execute single filter fetch
 */
async function executeSingleFilterFetch(
  config: SingleFilterConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  return fetchSingleFilter(config)
}

/**
 * Execute all orders fetch
 */
async function executeAllOrdersFetch(
  config: AllOrdersConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  return fetchAllOrders(config)
}

/**
 * Configuration for order book query execution
 */
export interface OrderBookQueryConfig {
  filters: OrderBookFilters | undefined
  pagination: OrderBookPagination
  network: 'mainnet' | 'testnet'
  buildSearchParams: (
    page: number,
    buyAsset?: string | null,
    sellAsset?: string | null,
    pageSize?: number
  ) => {
    requested?: string | null
    offered?: string | null
    page: number
    page_size: number
    status?: number
  }
  fetchAllPages: (options?: {
    buyAsset?: string | null
    sellAsset?: string | null
  }) => Promise<{ orders: OrderBookOrder[]; total: number }>
  searchOffers: DexieSearchOffers
  convertFn: (offer: DexieOffer) => OrderBookOrder
}

/**
 * Process and return order book query result
 */
export async function executeOrderBookQuery(
  config: OrderBookQueryConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  const { filters, pagination, network, buildSearchParams, fetchAllPages, searchOffers, convertFn } = config
  logger.debug('Fetching order book', {
    hasBuyAsset: !!filters?.buyAsset?.length,
    hasSellAsset: !!filters?.sellAsset?.length,
    buyAssetCount: filters?.buyAsset?.length || 0,
    sellAssetCount: filters?.sellAsset?.length || 0,
    pagination,
  })

  const strategy = determineFetchStrategy(filters)
  let result: { orders: OrderBookOrder[]; total: number; hasMore: boolean }

  if (strategy === 'bidirectional') {
    result = await executeBidirectionalFetch({
      buyAsset: filters!.buyAsset![0],
      sellAsset: filters!.sellAsset![0],
      pagination,
      buildSearchParams,
      fetchAllPages,
      searchOffers,
      convertFn,
    })
  } else if (strategy === 'single') {
    result = await executeSingleFilterFetch({
      buyAsset: filters?.buyAsset?.[0],
      sellAsset: filters?.sellAsset?.[0],
      buildSearchParams,
      searchOffers,
      convertFn,
    })
  } else {
    result = await executeAllOrdersFetch({
      pagination,
      buildSearchParams,
      fetchAllPages,
      searchOffers,
      convertFn,
    })
  }

  // Deduplicate and sort orders
  const deduplicatedOrders = deduplicateOrders(result.orders)
  const sortedOrders = sortOrdersByPrice(deduplicatedOrders, network)

  logger.debug(`Orders after deduplication: ${sortedOrders.length}`)

  return {
    orders: sortedOrders,
    hasMore: result.hasMore,
    total: result.total,
  }
}
