'use client'

import { useCatTokens } from '@/entities/asset'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import { useCallback, useEffect, useRef } from 'react'
import type { UseMyOffersState, UseMyOffersSetters } from '../useMyOffersState'

interface UseMyOffersUtilsProps {
  state: UseMyOffersState & UseMyOffersSetters
}

/**
 * Hook for utility functions (formatting, copying, etc.)
 */
export function useMyOffersUtils({ state }: UseMyOffersUtilsProps) {
  const { getCatTokenInfo } = useCatTokens()
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null)

  const getStatusClass = useCallback((status: string) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    }
    return classes[status as keyof typeof classes] || classes.pending
  }, [])

  const formatDate = useCallback((date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }, [])

  const copyOfferString = useCallback(
    async (offerString: string) => {
      if (!offerString) return

      try {
        await navigator.clipboard.writeText(offerString)
        state.setIsCopied(offerString)

        // Clear any existing timer before creating a new one
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current)
        }

        // Store the new timer ID
        copyTimerRef.current = setTimeout(() => {
          state.setIsCopied(null)
          copyTimerRef.current = null
        }, 2000)
      } catch {
        // Failed to copy offer string
      }
    },
    [state]
  )

  const getTickerSymbol = useCallback(
    (assetId: string): string => {
      const tokenInfo = getCatTokenInfo(assetId)
      // Guard against undefined tokenInfo and return safe fallback
      return tokenInfo?.ticker || assetId || 'Unknown'
    },
    [getCatTokenInfo]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
    }
  }, [])

  return {
    getStatusClass,
    formatDate,
    copyOfferString,
    getTickerSymbol,
    formatAssetAmount,
  }
}
