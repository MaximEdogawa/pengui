'use client'

import { logger } from '@/shared/lib/logger'
import { SIGN_CLIENT_CONFIG } from '@/shared/lib/walletConnect/constants/wallet-connect'
import type { WalletConnectInstance } from '@/shared/lib/walletConnect/types/walletConnect.types'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import SignClient from '@walletconnect/sign-client'
import { registerWalletConnectListeners } from './useWalletConnectEventListeners'

/**
 * Hook to get the WalletConnect SignClient instance
 * The SignClient is initialized once and cached using TanStack Query
 * Event listeners are automatically registered immediately when SignClient is created
 * to prevent race conditions where WalletConnect emits pings before listeners are registered
 */
export function useSignClient() {
  const instanceQuery = useQuery<WalletConnectInstance | undefined>({
    queryKey: ['walletConnect', 'instance'],
    queryFn: async () => {
      try {
        const signClient = await SignClient.init(SIGN_CLIENT_CONFIG)
        logger.info('🔄 WalletConnect SignClient initialized')
        
        // Register listeners IMMEDIATELY after initialization to prevent race conditions
        // This ensures listeners are ready before WalletConnect starts emitting events
        registerWalletConnectListeners(signClient)
        
        return { signClient }
      } catch (error) {
        logger.error('❌ WalletConnect SignClient initialization failed:', error)
        throw error
      }
    },
    enabled: true,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Register listeners as backup via useEffect (in case SignClient was cached)
  // This ensures listeners are registered even if the query returns cached data
  useEffect(() => {
    if (instanceQuery.data?.signClient) {
      registerWalletConnectListeners(instanceQuery.data.signClient)
    }
  }, [instanceQuery.data?.signClient])

  return {
    signClient: instanceQuery.data?.signClient,
    isInitializing: instanceQuery.isPending,
    isInitialized: instanceQuery.isSuccess,
    error: instanceQuery.error,
  }
}
