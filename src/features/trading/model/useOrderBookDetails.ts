'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

const MAX_DETAILED_ORDERS = 20
const DETAIL_CACHE_TIME = 5 * 60 * 1000 // 2 minutes

interface OrderDetail {
  orderId: string
  offerString: string
  fullMakerAddress: string
  offer: DexieOffer
}

/**
 * Hook to fetch and cache detailed offer data for visible orders only
 * Uses individual queries per order ID for optimal cache reuse
 * Limits to max 50 orders at once (total across both sides)
 *
 * Query Key Structure: ['orderBookDetails', orderId]
 * - Groups all queries under 'orderBookDetails' namespace in DevTools
 * - Each order has its own cache entry for better reuse
 * - TanStack Query automatically deduplicates identical queries
 */
export function useOrderBookDetails(visibleOrderIds: string[]) {
  const dexieDataService = useDexieDataService()

  // Limit to max 50 orders and deduplicate
  const limitedOrderIds = useMemo(() => {
    const unique = Array.from(new Set(visibleOrderIds))
    return unique.slice(0, MAX_DETAILED_ORDERS)
  }, [visibleOrderIds])

  // Use useQueries for individual queries - better cache reuse
  const detailQueries = useQueries({
    queries: limitedOrderIds.map((orderId) => ({
      queryKey: ['orderBookDetails', orderId], // Individual key per order
      queryFn: async (): Promise<OrderDetail> => {
        const response = await dexieDataService.inspectOffer(orderId)
        if (response.success && response.offer) {
          return {
            orderId,
            offerString: response.offer.offer || '',
            fullMakerAddress: response.offer.id || '',
            offer: response.offer,
          }
        }
        throw new Error(`Failed to fetch details for order ${orderId}`)
      },
      staleTime: DETAIL_CACHE_TIME,
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: orderId.length > 0,
      // Retry individual failed orders
      retry: 2,
      retryDelay: 1000,
    })),
  })

  // Create a map of orderId -> detailed data for easy lookup
  const detailsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        offerString?: string
        fullMakerAddress?: string
        offer?: unknown
      }
    >()

    detailQueries.forEach((query, index) => {
      const orderId = limitedOrderIds[index]
      if (query.data && orderId) {
        map.set(orderId, {
          offerString: query.data.offerString,
          fullMakerAddress: query.data.fullMakerAddress,
          offer: query.data.offer,
        })
      }
    })

    return map
  }, [detailQueries, limitedOrderIds])

  // Aggregate loading and error states
  const isLoading = detailQueries.some((query) => query.isLoading)
  const hasError = detailQueries.some((query) => query.isError)

  return {
    detailsMap,
    isLoading,
    hasError,
  }
}
