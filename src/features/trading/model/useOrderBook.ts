'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import { logger } from '@/shared/lib/logger'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type {
  OrderBookFilters,
  OrderBookOrder,
  OrderBookPagination,
  OrderBookQueryResult,
} from '../lib/orderBookTypes'
import { convertDexieOfferToOrderBookOrder as _convertDexieOfferToOrderBookOrder } from '../lib/orderBookConverters'
import { executeOrderBookQuery } from '../lib/orderBookQuery'
import { calculateRefetchInterval, calculateStaleTime } from '../lib/orderBookConfig'
import { buildOrderBookSearchParams } from '../lib/orderBookParams'

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

  // Create converter function with network context
  const convertDexieOfferToOrderBookOrderWithNetwork = (dexieOffer: DexieOffer): OrderBookOrder => {
    return _convertDexieOfferToOrderBookOrder(dexieOffer, network)
  }

  // Get pagination value from filters or use default
  const pagination = filters?.pagination || DEFAULT_PAGINATION

  // Helper function to build search parameters based on filters
  const buildSearchParams = (
    page: number,
    buyAsset?: string | null,
    sellAsset?: string | null,
    pageSize?: number
  ) => {
    return buildOrderBookSearchParams({
      page,
      pagination,
      network,
      buyAsset,
      sellAsset,
      filters,
      pageSize,
    })
  }

  // Helper function to fetch all pages recursively
  interface FetchAllPagesOptions {
    buyAsset?: string | null
    sellAsset?: string | null
    page?: number
    accumulatedOrders?: OrderBookOrder[]
    accumulatedTotal?: number
  }

  const fetchAllPagesInternal = async (
    options: FetchAllPagesOptions = {}
  ): Promise<{ orders: OrderBookOrder[]; total: number }> => {
    const {
      buyAsset,
      sellAsset,
      page = 0,
      accumulatedOrders = [],
      accumulatedTotal = 0,
    } = options

    const params = buildSearchParams(page, buyAsset, sellAsset, 100)
    const response = await dexieDataService.searchOffers(params)

    if (response.success && Array.isArray(response.data)) {
      const orders = (response.data as DexieOffer[])
        .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
        .map(convertDexieOfferToOrderBookOrderWithNetwork)

      const newOrders = [...accumulatedOrders, ...orders]
      const newTotal = response.total != null ? response.total : accumulatedTotal + orders.length

      if (response.data.length === 100) {
        return fetchAllPagesInternal({
          buyAsset,
          sellAsset,
          page: page + 1,
          accumulatedOrders: newOrders,
          accumulatedTotal: newTotal,
        })
      }

      return { orders: newOrders, total: newTotal }
    }

    return { orders: accumulatedOrders, total: accumulatedTotal }
  }

  // Wrapper function that matches the expected type signature
  const fetchAllPages = async (options?: {
    buyAsset?: string | null
    sellAsset?: string | null
  }): Promise<{ orders: OrderBookOrder[]; total: number }> => {
    return fetchAllPagesInternal(options || {})
  }

  const queryKey = useMemo(() => {
    const buyAssets = filters?.buyAsset || []
    const sellAssets = filters?.sellAsset || []
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')

    return ['orderBook', buyKey, sellKey, pagination, network]
  }, [filters?.buyAsset, filters?.sellAsset, pagination, network])

  const orderBookQuery = useQuery<OrderBookQueryResult>({
    queryKey,
    queryFn: async () => {
      return executeOrderBookQuery({
        filters,
        pagination,
        network,
        buildSearchParams,
        fetchAllPages,
        searchOffers: dexieDataService.searchOffers,
        convertFn: convertDexieOfferToOrderBookOrderWithNetwork,
      })
    },
    staleTime: calculateStaleTime(pagination),
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: calculateRefetchInterval(pagination),
    refetchIntervalInBackground: pagination !== 'all', // Continue refetching only if not "all"
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: pagination !== 'all', // Refetch on focus only if not "all"
  })

  const orderBookData = orderBookQuery.data?.orders || []
  const orderBookLoading = orderBookQuery.isLoading
  const orderBookError = orderBookQuery.error
  const orderBookHasMore = orderBookQuery.data?.hasMore || false
  const orderBookTotal = orderBookQuery.data?.total || 0

  const refreshOrderBook = () => {
    orderBookQuery.refetch()
  }

  return {
    orderBookData,
    orderBookTotal,
    orderBookLoading,
    orderBookError,
    orderBookHasMore,
    refreshOrderBook,
    orderBookQuery,
  }
}
