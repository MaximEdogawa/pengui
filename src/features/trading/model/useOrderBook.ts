'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type {
  OrderBookFilters,
  OrderBookOrder,
  OrderBookPagination,
  OrderBookQueryResult,
} from '../lib/orderBookTypes'

const DEFAULT_PAGINATION: OrderBookPagination = 50

/**
 * Hook for fetching and managing order book data from Dexie API
 * Provides caching, loading states, and automatic refetching
 */
export function useOrderBook(filters?: OrderBookFilters) {
  const dexieDataService = useDexieDataService()

  // Log filters on mount and when they change (debug only, minimal data)
  useEffect(() => {
    logger.debug('useOrderBook filters changed:', {
      hasBuyAsset: !!filters?.buyAsset?.length,
      hasSellAsset: !!filters?.sellAsset?.length,
      buyAssetCount: filters?.buyAsset?.length || 0,
      sellAssetCount: filters?.sellAsset?.length || 0,
      pagination: filters?.pagination || DEFAULT_PAGINATION,
    })
  }, [filters])

  // Helper function to convert Dexie offer to OrderBookOrder format
  const convertDexieOfferToOrderBookOrder = (dexieOffer: DexieOffer): OrderBookOrder => {
    // Ensure amounts are numbers and handle undefined/null values
    const safeOffered = dexieOffer.offered.map((item) => ({
      ...item,
      amount: typeof item.amount === 'number' ? item.amount : 0,
    }))
    const safeRequested = dexieOffer.requested.map((item) => ({
      ...item,
      amount: typeof item.amount === 'number' ? item.amount : 0,
    }))

    // Calculate USD values - for now set to 0 since we don't have real prices
    const offeringUsdValue = 0
    const requestingUsdValue = 0

    // Calculate XCH values - only count native token amounts
    const offeringXchValue = safeOffered.reduce((sum: number, item) => {
      if (item.code === 'TXCH' || item.code === 'XCH' || !item.code) {
        return sum + item.amount
      }
      return sum
    }, 0)
    const requestingXchValue = safeRequested.reduce((sum: number, item) => {
      if (item.code === 'TXCH' || item.code === 'XCH' || !item.code) {
        return sum + item.amount
      }
      return sum
    }, 0)

    // Calculate pricePerUnit from actual amounts when there's one asset on each side
    const pricePerUnit =
      safeOffered.length === 1 && safeRequested.length === 1 && safeOffered[0]?.amount > 0
        ? safeRequested[0].amount / safeOffered[0].amount
        : 0

    return {
      id: dexieOffer.id,
      offering: safeOffered,
      requesting: safeRequested,
      maker: `0x${dexieOffer.id.substring(0, 8)}...${dexieOffer.id.substring(dexieOffer.id.length - 8)}`,
      timestamp: new Date(dexieOffer.date_found).toLocaleTimeString(),
      offeringUsdValue,
      requestingUsdValue,
      offeringXchValue,
      requestingXchValue,
      pricePerUnit,
      status: dexieOffer.status,
      date_found: dexieOffer.date_found,
      date_completed: dexieOffer.date_completed,
      date_pending: dexieOffer.date_pending,
      date_expiry: dexieOffer.date_expiry,
      known_taker: dexieOffer.known_taker,
    }
  }

  // Helper function to determine if an offer is a sell order (offering native token)
  const isSellOrder = (order: OrderBookOrder): boolean => {
    const nativeTicker = getNativeTokenTicker()
    return order.offering.some(
      (asset) => asset.code === nativeTicker || asset.code === 'TXCH' || asset.code === 'XCH'
    )
  }

  // Helper function to sort orders by price
  // Future: Check API response for sorted indicator to skip client-side sorting
  const sortOrdersByPrice = (
    orders: OrderBookOrder[],
    apiResponse?: { sorted?: boolean }
  ): OrderBookOrder[] => {
    // Future: If API indicates it's sorted, trust it
    // if (apiResponse?.sorted === true) {
    //   return orders // API already sorted it
    // }

    // Current: Always sort client-side (defensive)
    return orders.sort((a, b) => {
      // Sell orders: sort by price descending (high to low)
      // Buy orders: sort by price ascending (low to high)
      if (isSellOrder(a) && isSellOrder(b)) {
        return b.pricePerUnit - a.pricePerUnit // High to low for sell orders
      } else if (!isSellOrder(a) && !isSellOrder(b)) {
        return a.pricePerUnit - b.pricePerUnit // Low to high for buy orders
      } else {
        // Mixed order types: sell orders first, then buy orders
        return isSellOrder(a) ? -1 : 1
      }
    })
  }

  // Calculate refetch interval based on pagination
  const calculateRefetchInterval = (pagination: OrderBookPagination): number | false => {
    const intervals: Record<OrderBookPagination, number | false> = {
      10: 10 * 1000, // 10 seconds
      15: 15 * 1000, // 15 seconds
      50: 30 * 1000, // 30 seconds
      100: 60 * 1000, // 60 seconds
      all: false, // No auto-refetch
    }
    return intervals[pagination]
  }

  // Calculate stale time based on pagination
  const calculateStaleTime = (pagination: OrderBookPagination): number => {
    const staleTimes: Record<OrderBookPagination, number> = {
      10: 5 * 1000, // 5 seconds
      15: 5 * 1000, // 5 seconds
      50: 15 * 1000, // 15 seconds
      100: 30 * 1000, // 30 seconds
      all: 60 * 1000, // 60 seconds
    }
    return staleTimes[pagination]
  }

  // Helper function to normalize ticker for API (XCH -> TXCH on testnet, etc.)
  const normalizeTickerForApi = (ticker: string): string => {
    const nativeTicker = getNativeTokenTicker()
    // If the ticker is XCH or TXCH, normalize to the correct native token for the network
    if (ticker.toUpperCase() === 'XCH' || ticker.toUpperCase() === 'TXCH') {
      return nativeTicker
    }
    // Return ticker as-is for other assets
    return ticker
  }

  // Get pagination value from filters or use default
  const pagination = filters?.pagination || DEFAULT_PAGINATION

  // Helper function to fetch all pages recursively
  const fetchAllPages = async (
    buyAsset?: string | null,
    sellAsset?: string | null,
    page = 0,
    accumulatedOrders: OrderBookOrder[] = [],
    accumulatedTotal = 0
  ): Promise<{ orders: OrderBookOrder[]; total: number }> => {
    const params = buildSearchParams(page, buyAsset, sellAsset, 100)
    const response = await dexieDataService.searchOffers(params)

    if (response.success && Array.isArray(response.data)) {
      const orders = (response.data as DexieOffer[])
        .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
        .map(convertDexieOfferToOrderBookOrder)

      const newOrders = [...accumulatedOrders, ...orders]

      // Use response.total as authoritative total if provided (preferably on page 0)
      // Only accumulate orders.length when response.total is undefined
      const newTotal = response.total != null ? response.total : accumulatedTotal + orders.length

      // If we got a full page (100 items), there might be more
      if (response.data.length === 100) {
        return fetchAllPages(buyAsset, sellAsset, page + 1, newOrders, newTotal)
      }

      return { orders: newOrders, total: newTotal }
    }

    return { orders: accumulatedOrders, total: accumulatedTotal }
  }

  // Helper function to build search parameters based on filters
  const buildSearchParams = (
    page: number,
    buyAsset?: string | null,
    sellAsset?: string | null,
    pageSize?: number
  ) => {
    const params: {
      page: number
      page_size: number
      status: number
      requested?: string
      offered?: string
    } = {
      page,
      page_size: pageSize || (pagination === 'all' ? 100 : pagination),
      status: 0, // Only open offers
    }

    // Use provided parameters or fall back to filters
    // If explicitly passed as null, don't use filters (treat as "don't use this parameter")
    // If undefined, use filter if available
    let targetBuyAsset: string | undefined
    if (buyAsset === null) {
      // Explicitly null: don't use this parameter
      targetBuyAsset = undefined
    } else if (buyAsset !== undefined) {
      // Explicitly provided value
      targetBuyAsset = buyAsset
    } else {
      // Undefined: use filter if available
      targetBuyAsset = filters?.buyAsset?.[0]
    }

    let targetSellAsset: string | undefined
    if (sellAsset === null) {
      // Explicitly null: don't use this parameter
      targetSellAsset = undefined
    } else if (sellAsset !== undefined) {
      // Explicitly provided value
      targetSellAsset = sellAsset
    } else {
      // Undefined: use filter if available
      targetSellAsset = filters?.sellAsset?.[0]
    }

    // Normalize tickers for API (XCH -> TXCH on testnet, etc.)
    if (targetBuyAsset) {
      targetBuyAsset = normalizeTickerForApi(targetBuyAsset)
    }
    if (targetSellAsset) {
      targetSellAsset = normalizeTickerForApi(targetSellAsset)
    }

    // For buy/sell filtering, we need to determine which asset is being bought/sold
    // If user wants to buy an asset (buyAsset), they're looking for offers where that asset is requested
    // If user wants to sell an asset (sellAsset), they're looking for offers where that asset is offered

    if (targetBuyAsset && !targetSellAsset) {
      // Only buyAsset: user wants to buy, so look for offers where the asset is requested
      params.requested = targetBuyAsset
    } else if (targetSellAsset && !targetBuyAsset) {
      // Only sellAsset: user wants to sell, so look for offers where the asset is offered
      params.offered = targetSellAsset
    } else if (targetBuyAsset && targetSellAsset) {
      // Both filters set: user wants to buy buyAsset and sell sellAsset
      // Look for offers where buyAsset is requested and sellAsset is offered
      params.requested = targetBuyAsset
      params.offered = targetSellAsset
    }

    return params
  }

  // Create query key that includes filters and pagination for proper caching
  // Use arrays directly - React Query will handle deep comparison
  const queryKey = useMemo(() => {
    const buyAssets = filters?.buyAsset || []
    const sellAssets = filters?.sellAsset || []

    // Create a stable key based on filter values
    // Sort arrays to ensure consistent key generation
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')

    return ['orderBook', buyKey, sellKey, pagination]
  }, [filters?.buyAsset, filters?.sellAsset, pagination])

  // Main order book query
  const orderBookQuery = useQuery<OrderBookQueryResult>({
    queryKey,
    queryFn: async () => {
      logger.debug('Fetching order book', {
        hasBuyAsset: !!filters?.buyAsset?.length,
        hasSellAsset: !!filters?.sellAsset?.length,
        buyAssetCount: filters?.buyAsset?.length || 0,
        sellAssetCount: filters?.sellAsset?.length || 0,
        pagination,
      })
      const allOrders: OrderBookOrder[] = []
      let totalCount = 0
      // Track per-query "hasMore" indicators (whether each query returned a full page)
      const queryHasMoreFlags: boolean[] = []

      // If we have both buy and sell assets, fetch both directions
      if (
        filters?.buyAsset &&
        filters.buyAsset.length > 0 &&
        filters?.sellAsset &&
        filters.sellAsset.length > 0
      ) {
        const buyAsset = filters.buyAsset[0]
        const sellAsset = filters.sellAsset[0]

        logger.debug(`Fetching orders for pair (bidirectional)`)

        // Handle pagination for "all" case
        if (pagination === 'all') {
          // Fetch all pages for both directions using recursive helper
          const result1 = await fetchAllPages(buyAsset, sellAsset)
          allOrders.push(...result1.orders)
          totalCount += result1.total

          const result2 = await fetchAllPages(sellAsset, buyAsset)
          allOrders.push(...result2.orders)
          totalCount += result2.total
        } else {
          // Query 1: Original direction (buyAsset/sellAsset)
          const params1 = buildSearchParams(0, buyAsset, sellAsset)
          logger.debug('Query 1', {
            page: params1.page,
            pageSize: params1.page_size,
            hasRequested: !!params1.requested,
            hasOffered: !!params1.offered,
          })
          const response1 = await dexieDataService.searchOffers(params1)
          logger.debug('Query 1 response', {
            success: response1.success,
            count: response1.data?.length || 0,
          })

          if (response1.success && Array.isArray(response1.data)) {
            const orders1 = (response1.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders1)
            totalCount += response1.total || orders1.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders1.length >= params1.page_size)
            logger.debug(`Query 1: Added ${orders1.length} orders`)
          }

          // Query 2: Reverse direction (sellAsset/buyAsset)
          const params2 = buildSearchParams(0, sellAsset, buyAsset)
          logger.debug('Query 2', {
            page: params2.page,
            pageSize: params2.page_size,
            hasRequested: !!params2.requested,
            hasOffered: !!params2.offered,
          })
          const response2 = await dexieDataService.searchOffers(params2)
          logger.debug('Query 2 response', {
            success: response2.success,
            count: response2.data?.length || 0,
          })

          if (response2.success && Array.isArray(response2.data)) {
            const orders2 = (response2.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders2)
            totalCount += response2.total || orders2.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders2.length >= params2.page_size)
            logger.debug(`Query 2: Added ${orders2.length} orders`)
          }
        }
      } else if (
        (filters?.buyAsset && filters.buyAsset.length > 0) ||
        (filters?.sellAsset && filters.sellAsset.length > 0)
      ) {
        // Single filter case: fetch orders in both directions to populate both buy and sell sides
        const buyAsset = filters?.buyAsset?.[0]
        const sellAsset = filters?.sellAsset?.[0]

        logger.debug('Fetching orders with single filter')

        // If only buyAsset is set: fetch orders where buyAsset is requested (user wants to buy) AND offered (to populate sell side)
        // If only sellAsset is set: fetch orders where sellAsset is offered (user wants to sell) AND requested (to populate buy side)
        // This ensures we get both buy and sell sides populated

        if (buyAsset && !sellAsset) {
          // Query 1: Orders where buyAsset is requested (user wants to buy it)
          const params1 = buildSearchParams(0, buyAsset, undefined)
          logger.debug('Query 1 (offered)', {
            page: params1.page,
            pageSize: params1.page_size,
            hasOffered: !!params1.offered,
          })
          const response1 = await dexieDataService.searchOffers(params1)
          if (response1.success && Array.isArray(response1.data)) {
            const orders1 = (response1.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders1)
            totalCount += response1.total || orders1.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders1.length >= params1.page_size)
            logger.debug(`Query 1: Added ${orders1.length} orders`)
          }

          // Query 2: Orders where buyAsset is offered (to populate sell side - opposite direction)
          const params2 = buildSearchParams(0, null, buyAsset)
          logger.debug('Query 2 (requested)', {
            page: params2.page,
            pageSize: params2.page_size,
            hasRequested: !!params2.requested,
          })
          const response2 = await dexieDataService.searchOffers(params2)
          if (response2.success && Array.isArray(response2.data)) {
            const orders2 = (response2.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders2)
            totalCount += response2.total || orders2.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders2.length >= params2.page_size)
            logger.debug(`Query 2: Added ${orders2.length} orders`)
          }
        } else if (sellAsset && !buyAsset) {
          // Query 1: Orders where sellAsset is offered (user wants to sell it)
          const params1 = buildSearchParams(0, undefined, sellAsset)
          logger.debug('Query 1 (requested)', {
            page: params1.page,
            pageSize: params1.page_size,
            hasRequested: !!params1.requested,
          })
          const response1 = await dexieDataService.searchOffers(params1)
          if (response1.success && Array.isArray(response1.data)) {
            const orders1 = (response1.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders1)
            totalCount += response1.total || orders1.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders1.length >= params1.page_size)
            logger.debug(`Query 1: Added ${orders1.length} orders`)
          }

          // Query 2: Orders where sellAsset is requested (to populate buy side - opposite direction)
          const params2 = buildSearchParams(0, sellAsset, null)
          logger.debug('Query 2 (offered)', {
            page: params2.page,
            pageSize: params2.page_size,
            hasOffered: !!params2.offered,
          })
          const response2 = await dexieDataService.searchOffers(params2)
          if (response2.success && Array.isArray(response2.data)) {
            const orders2 = (response2.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders2)
            totalCount += response2.total || orders2.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders2.length >= params2.page_size)
            logger.debug(`Query 2: Added ${orders2.length} orders`)
          }
        }
      } else {
        // No filters - fetch all orders
        logger.debug('Fetching all orders (no filters)')
        if (pagination === 'all') {
          // Fetch all pages using recursive helper
          const result = await fetchAllPages(undefined, undefined)
          allOrders.push(...result.orders)
          totalCount = result.total
        } else {
          const params = buildSearchParams(0)
          logger.debug('Query params', {
            page: params.page,
            pageSize: params.page_size,
            status: params.status,
          })
          const response = await dexieDataService.searchOffers(params)
          logger.debug('Query response', {
            success: response.success,
            count: response.data?.length || 0,
          })

          if (response.success && Array.isArray(response.data)) {
            const orders = (response.data as DexieOffer[])
              .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
              .map(convertDexieOfferToOrderBookOrder)
            allOrders.push(...orders)
            totalCount = response.total || orders.length
            // Check if this query returned a full page (indicating more data available)
            queryHasMoreFlags.push(orders.length >= params.page_size)
            logger.debug(`Added ${orders.length} orders`)
          }
        }
      }

      // Capture raw count before deduplication for hasMore calculation
      const rawOrdersCount = allOrders.length
      logger.debug(`Total orders fetched: ${rawOrdersCount}`)

      // Deduplicate orders by ID to prevent duplicate keys
      const uniqueOrdersMap = new Map<string, OrderBookOrder>()
      allOrders.forEach((order) => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order)
        }
      })
      const deduplicatedOrders = Array.from(uniqueOrdersMap.values())
      logger.debug(`Orders after deduplication: ${deduplicatedOrders.length}`)

      // Sort all orders by price before returning
      const sortedOrders = sortOrdersByPrice(deduplicatedOrders)

      // Determine hasMore based on pre-deduplication count or per-query indicators
      const pageSize = pagination === 'all' ? 100 : pagination
      // Use OR of per-query flags if available, otherwise use raw count vs pageSize
      const hasMore =
        pagination !== 'all' &&
        (queryHasMoreFlags.some((flag) => flag) || rawOrdersCount >= pageSize)

      return {
        orders: sortedOrders,
        hasMore,
        total: totalCount,
      }
    },
    staleTime: calculateStaleTime(pagination),
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: calculateRefetchInterval(pagination),
    refetchIntervalInBackground: pagination !== 'all', // Continue refetching only if not "all"
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: pagination !== 'all', // Refetch on focus only if not "all"
  })

  // Computed properties for easy access
  const orderBookData = orderBookQuery.data?.orders || []
  const orderBookLoading = orderBookQuery.isLoading
  const orderBookError = orderBookQuery.error
  const orderBookHasMore = orderBookQuery.data?.hasMore || false
  const orderBookTotal = orderBookQuery.data?.total || 0

  // Manual refresh function
  const refreshOrderBook = () => {
    // Invalidate and refetch to ensure fresh data
    orderBookQuery.refetch()
  }

  return {
    // Data
    orderBookData,
    orderBookTotal,

    // Loading states
    orderBookLoading,
    orderBookError,
    orderBookHasMore,

    // Methods
    refreshOrderBook,

    // Query for advanced usage
    orderBookQuery,
  }
}
