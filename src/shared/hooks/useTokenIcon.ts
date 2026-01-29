'use client'

/**
 * Shared hook for fetching token icons using TanStack Query
 * Used by both shared layer components and entities layer
 * All components share the same TanStack Query cache
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTokenInfo } from '@/shared/lib/services/spaceScanService'

// Query key - shared across all icon fetching
export const TOKEN_ICON_QUERY_KEY = ['spacescan', 'token-icon'] as const

// Cache duration: 24 hours
const CACHE_TIME = 24 * 60 * 60 * 1000

// XCH identifiers that should use XchIcon instead
const XCH_IDS = new Set(['xch', 'txch', ''])

export interface UseTokenIconResult {
  imageUrl: string | null
  isLoading: boolean
  error: Error | null
}

/**
 * Check if asset ID is XCH/TXCH
 */
export function isXchAssetId(assetId: string | null | undefined): boolean {
  return XCH_IDS.has(assetId?.toLowerCase() || '')
}

/**
 * Hook to fetch a token icon URL with TanStack Query caching
 * @param assetId - The asset ID (null/undefined/empty for XCH)
 */
export function useTokenIcon(assetId: string | null | undefined): UseTokenIconResult {
  const id = assetId?.toLowerCase() || ''
  const isXch = XCH_IDS.has(id)
  
  const { data, isLoading, error } = useQuery({
    queryKey: [...TOKEN_ICON_QUERY_KEY, id],
    queryFn: async () => {
      const info = await fetchTokenInfo(assetId!)
      return info?.preview_url || null
    },
    enabled: !!assetId && !isXch,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    imageUrl: data ?? null,
    isLoading: !!assetId && !isXch && isLoading,
    error: error as Error | null,
  }
}

/**
 * Hook to preload token icons for a list of asset IDs
 * Uses TanStack Query's prefetchQuery for consistent caching
 */
export function usePreloadTokenIcons() {
  const queryClient = useQueryClient()
  
  return (assetIds: string[]) => {
    assetIds.forEach(assetId => {
      if (!assetId || isXchAssetId(assetId)) return
      
      const id = assetId.toLowerCase()
      
      // Only prefetch if not already in cache
      const cached = queryClient.getQueryData([...TOKEN_ICON_QUERY_KEY, id])
      if (cached !== undefined) return
      
      queryClient.prefetchQuery({
        queryKey: [...TOKEN_ICON_QUERY_KEY, id],
        queryFn: async () => {
          const info = await fetchTokenInfo(assetId)
          return info?.preview_url || null
        },
        staleTime: CACHE_TIME,
        gcTime: CACHE_TIME,
      })
    })
  }
}
