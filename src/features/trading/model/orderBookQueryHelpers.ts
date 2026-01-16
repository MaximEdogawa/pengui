/**
 * Helper functions for order book queries
 * Extracted to reduce complexity and improve maintainability
 */

import { logger } from '@/shared/lib/logger'
import type { DexieOffer } from '@/entities/offer'
import type {
  DexieOfferSearchParams,
  DexieOfferSearchResponse,
} from '@/features/offers/lib/dexieTypes'
import type { OrderBookOrder, OrderBookPagination } from '../lib/orderBookTypes'

/**
 * Type for Dexie data service searchOffers method
 * Matches the actual return type from useDexieDataService().searchOffers (UseMutateAsyncFunction)
 */
export type DexieSearchOffers = (
  params: DexieOfferSearchParams
) => Promise<DexieOfferSearchResponse>

export interface QueryResult {
  orders: OrderBookOrder[]
  total: number
  hasMore: boolean
}

/**
 * Configuration for building search parameters
 */
export interface BuildSearchParamsConfig {
  page: number
  buyAsset?: string | null
  sellAsset?: string | null
  pageSize?: number
}

/**
 * Configuration for fetching all pages
 */
export interface FetchAllPagesConfig {
  buyAsset?: string | null
  sellAsset?: string | null
  page?: number
  accumulatedOrders?: OrderBookOrder[]
  accumulatedTotal?: number
}

/**
 * Configuration for bidirectional pair query
 */
export interface BidirectionalPairConfig {
  buyAsset: string
  sellAsset: string
  pagination: OrderBookPagination
  buildSearchParams: (page: number, buy?: string | null, sell?: string | null) => {
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
 * Configuration for single filter query
 */
export interface SingleFilterConfig {
  buyAsset: string | undefined
  sellAsset: string | undefined
  buildSearchParams: (page: number, buy?: string | null, sell?: string | null) => {
    requested?: string | null
    offered?: string | null
    page: number
    page_size: number
    status?: number
  }
  searchOffers: DexieSearchOffers
  convertFn: (offer: DexieOffer) => OrderBookOrder
}

/**
 * Configuration for all orders query
 */
export interface AllOrdersConfig {
  pagination: OrderBookPagination
  buildSearchParams: (page: number) => {
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
 * Process a single search response and convert to orders
 */
export function processSearchResponse(
  response: { success: boolean; data?: unknown[]; total?: number },
  params: { page_size: number },
  convertFn: (offer: DexieOffer) => OrderBookOrder
): QueryResult {
  if (!response.success || !Array.isArray(response.data)) {
    return { orders: [], total: 0, hasMore: false }
  }

  const orders = (response.data as DexieOffer[])
    .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
    .map(convertFn)

  const hasMore = orders.length >= params.page_size
  const total = response.total || orders.length

  return { orders, total, hasMore }
}

/**
 * Execute a single search query
 */
export async function executeSearchQuery(
  params: {
    requested?: string | null
    offered?: string | null
    page?: number
    page_size: number
    status?: number
  },
  searchOffers: DexieSearchOffers,
  convertFn: (offer: DexieOffer) => OrderBookOrder,
  queryLabel: string
): Promise<QueryResult> {
  logger.debug(`Query: ${queryLabel}`, {
    page: params.page,
    pageSize: params.page_size,
    hasRequested: !!params.requested,
    hasOffered: !!params.offered,
  })

  // Convert params to match DexieOfferSearchParams (remove null values)
  const searchParams: DexieOfferSearchParams = {
    page: params.page,
    page_size: params.page_size,
    status: params.status,
  }

  if (params.requested !== null && params.requested !== undefined) {
    searchParams.requested = params.requested
  }
  if (params.offered !== null && params.offered !== undefined) {
    searchParams.offered = params.offered
  }

  const response = await searchOffers(searchParams)
  logger.debug(`Query ${queryLabel} response`, {
    success: response.success,
    count: response.data?.length || 0,
  })

  const result = processSearchResponse(response, params, convertFn)
  logger.debug(`Query ${queryLabel}: Added ${result.orders.length} orders`)

  return result
}

/**
 * Fetch orders for bidirectional pair (both buyAsset and sellAsset)
 */
export async function fetchBidirectionalPair(
  config: BidirectionalPairConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  const { buyAsset, sellAsset, pagination, buildSearchParams, fetchAllPages, searchOffers, convertFn } = config
  const allOrders: OrderBookOrder[] = []
  let totalCount = 0
  const queryHasMoreFlags: boolean[] = []

  if (pagination === 'all') {
    const result1 = await fetchAllPages({ buyAsset, sellAsset })
    allOrders.push(...result1.orders)
    totalCount += result1.total

    const result2 = await fetchAllPages({ buyAsset: sellAsset, sellAsset: buyAsset })
    allOrders.push(...result2.orders)
    totalCount += result2.total
  } else {
    const params1 = buildSearchParams(0, buyAsset, sellAsset)
    const result1 = await executeSearchQuery(params1, searchOffers, convertFn, '1')
    allOrders.push(...result1.orders)
    totalCount += result1.total
    queryHasMoreFlags.push(result1.hasMore)

    const params2 = buildSearchParams(0, sellAsset, buyAsset)
    const result2 = await executeSearchQuery(params2, searchOffers, convertFn, '2')
    allOrders.push(...result2.orders)
    totalCount += result2.total
    queryHasMoreFlags.push(result2.hasMore)
  }

  return {
    orders: allOrders,
    total: totalCount,
    hasMore: queryHasMoreFlags.some((flag) => flag),
  }
}

/**
 * Fetch orders for single filter (buyAsset or sellAsset only)
 */
export async function fetchSingleFilter(
  config: SingleFilterConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  const { buyAsset, sellAsset, buildSearchParams, searchOffers, convertFn } = config
  const allOrders: OrderBookOrder[] = []
  let totalCount = 0
  const queryHasMoreFlags: boolean[] = []

  if (buyAsset && !sellAsset) {
    const params1 = buildSearchParams(0, buyAsset, undefined)
    const result1 = await executeSearchQuery(params1, searchOffers, convertFn, '1 (offered)')
    allOrders.push(...result1.orders)
    totalCount += result1.total
    queryHasMoreFlags.push(result1.hasMore)

    const params2 = buildSearchParams(0, null, buyAsset)
    const result2 = await executeSearchQuery(params2, searchOffers, convertFn, '2 (requested)')
    allOrders.push(...result2.orders)
    totalCount += result2.total
    queryHasMoreFlags.push(result2.hasMore)
  } else if (sellAsset && !buyAsset) {
    const params1 = buildSearchParams(0, undefined, sellAsset)
    const result1 = await executeSearchQuery(params1, searchOffers, convertFn, '1 (requested)')
    allOrders.push(...result1.orders)
    totalCount += result1.total
    queryHasMoreFlags.push(result1.hasMore)

    const params2 = buildSearchParams(0, sellAsset, null)
    const result2 = await executeSearchQuery(params2, searchOffers, convertFn, '2 (offered)')
    allOrders.push(...result2.orders)
    totalCount += result2.total
    queryHasMoreFlags.push(result2.hasMore)
  }

  return {
    orders: allOrders,
    total: totalCount,
    hasMore: queryHasMoreFlags.some((flag) => flag),
  }
}

/**
 * Fetch all orders (no filters)
 */
export async function fetchAllOrders(
  config: AllOrdersConfig
): Promise<{ orders: OrderBookOrder[]; total: number; hasMore: boolean }> {
  const { pagination, buildSearchParams, fetchAllPages, searchOffers, convertFn } = config

  if (pagination === 'all') {
    const result = await fetchAllPages({})
    return { orders: result.orders, total: result.total, hasMore: false }
  }

  const params = buildSearchParams(0)
  const result = await executeSearchQuery(params, searchOffers, convertFn, 'all orders')
  return { orders: result.orders, total: result.total, hasMore: result.hasMore }
}
