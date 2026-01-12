'use client'

import { useEffect, useState } from 'react'

interface UseBalanceLoadingProps {
  isConnected: boolean
  isLoading: boolean
  hasBalance: boolean
  delay?: number
}

/**
 * Hook to manage balance loading state with a small delay
 * Prevents flickering by showing loading state only after a delay
 */
export function useBalanceLoading({
  isConnected,
  isLoading,
  hasBalance,
  delay = 300,
}: UseBalanceLoadingProps) {
  const [showInitialLoading, setShowInitialLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (isConnected && isLoading) {
      const timer = setTimeout(() => {
        setShowInitialLoading(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      setShowInitialLoading(false)
    }
  }, [isConnected, isLoading, delay])

  const showSpinner =
    isLoading || isRefreshing || (showInitialLoading && isConnected && !hasBalance)

  return {
    showSpinner,
    isRefreshing,
    setIsRefreshing,
  }
}
