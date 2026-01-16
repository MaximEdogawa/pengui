'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import {
  fetchBidirectionalPair,
  fetchSingleFilter,
  fetchAllOrders,
} from './orderBookQueryHelpers'
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
  const { network } = useNetwork()

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
    const nativeTicker = getNativeTokenTickerForNetwork(network)
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
    const nativeTicker = getNativeTokenTickerForNetwork(network)
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

    return ['orderBook', buyKey, sellKey, pagination, network]
  }, [filters?.buyAsset, filters?.sellAsset, pagination, network])

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

      let result: { orders: OrderBookOrder[]; total: number; hasMore: boolean }

      // Route to appropriate fetch function based on filter state
      if (
        filters?.buyAsset &&
        filters.buyAsset.length > 0 &&
        filters?.sellAsset &&
        filters.sellAsset.length > 0
      ) {
        // Both filters: bidirectional pair
        result = await fetchBidirectionalPair(
          filters.buyAsset[0],
          filters.sellAsset[0],
          pagination,
          buildSearchParams,
          fetchAllPages,
          dexieDataService.searchOffers,
          convertDexieOfferToOrderBookOrder
        )
      } else if (
        (filters?.buyAsset && filters.buyAsset.length > 0) ||
        (filters?.sellAsset && filters.sellAsset.length > 0)
      ) {
        // Single filter
        result = await fetchSingleFilter(
          filters?.buyAsset?.[0],
          filters?.sellAsset?.[0],
          buildSearchParams,
          dexieDataService.searchOffers,
          convertDexieOfferToOrderBookOrder
        )
      } else {
        // No filters: fetch all
        result = await fetchAllOrders(
          pagination,
          buildSearchParams,
          fetchAllPages,
          dexieDataService.searchOffers,
          convertDexieOfferToOrderBookOrder
        )
      }

      // Deduplicate and sort orders
      const uniqueOrdersMap = new Map<string, OrderBookOrder>()
      result.orders.forEach((order) => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order)
        }
      })
      const deduplicatedOrders = Array.from(uniqueOrdersMap.values())
      const sortedOrders = sortOrdersByPrice(deduplicatedOrders)

      logger.debug(`Orders after deduplication: ${sortedOrders.length}`)

      return {
        orders: sortedOrders,
        hasMore: result.hasMore,
        total: result.total,
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
