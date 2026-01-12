'use client'

import { logger } from '@/shared/lib/logger'
import { SIGN_CLIENT_CONFIG } from '@/shared/lib/walletConnect/constants/wallet-connect'
import type { WalletConnectInstance } from '@/shared/lib/walletConnect/types/walletConnect.types'
import { useQuery } from '@tanstack/react-query'
import SignClient from '@walletconnect/sign-client'
import { useWalletConnectEventListeners } from './useWalletConnectEventListeners'

/**
 * Hook to get the WalletConnect SignClient instance
 * The SignClient is initialized once and cached using TanStack Query
 * Event listeners are automatically registered when SignClient is ready
 */
export function useSignClient() {
  const instanceQuery = useQuery<WalletConnectInstance | undefined>({
    queryKey: ['walletConnect', 'instance'],
    queryFn: async () => {
      try {
        const signClient = await SignClient.init(SIGN_CLIENT_CONFIG)
        logger.info('🔄 WalletConnect SignClient initialized')
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

  // Register event listeners when SignClient is ready
  useWalletConnectEventListeners(instanceQuery.data?.signClient)

  return {
    signClient: instanceQuery.data?.signClient,
    isInitializing: instanceQuery.isPending,
    isInitialized: instanceQuery.isSuccess,
    error: instanceQuery.error,
  }
}
