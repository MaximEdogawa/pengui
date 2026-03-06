'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigationProgress } from './NavigationProgressProvider'

/**
 * Cancels in-flight wallet/API queries the moment a navigation starts.
 * On 3G networks, the ongoing WalletConnect relay traffic (batch CAT
 * balance queries) saturates the connection and prevents Next.js from
 * fetching the new route's JS chunk. Cancelling these queries immediately
 * frees bandwidth so the page transition can complete.
 *
 * Must be rendered inside both NavigationProgressProvider and ReactQueryProvider.
 */
export function NavigationQueryCleanup() {
  const { isNavigating } = useNavigationProgress()
  const queryClient = useQueryClient()
  const prevNavigatingRef = useRef(false)

  useEffect(() => {
    if (isNavigating && !prevNavigatingRef.current) {
      queryClient.cancelQueries({ queryKey: ['walletConnect', 'balance'] })
      queryClient.cancelQueries({ queryKey: ['spacescan'] })
      queryClient.cancelQueries({ queryKey: ['spacescan', 'all-tokens'] })
    }
    prevNavigatingRef.current = isNavigating
  }, [isNavigating, queryClient])

  return null
}
