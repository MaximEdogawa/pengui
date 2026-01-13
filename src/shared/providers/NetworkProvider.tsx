'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { chainIdToNetwork } from '@/shared/lib/utils/networkUtils'
import { getStoredNetwork, setStoredNetwork, hasNetworkPreference } from '@/shared/lib/utils/networkStorage'
import { clearNetworkMismatchTracking } from '@/shared/lib/walletConnect/utils/networkMismatch'
import { logger } from '@/shared/lib/logger'

type Network = 'mainnet' | 'testnet'

interface NetworkContextType {
  network: Network
  setNetwork: (network: Network) => Promise<void>
  isMainnet: boolean
  isTestnet: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { isConnected, walletConnectSession } = useWalletConnectionState()
  const [network, setNetworkState] = useState<Network>(() => getStoredNetwork('mainnet'))
  const [isSwitching, setIsSwitching] = useState(false)
  const hasAutoSyncedRef = useRef(false)
  const lastWalletChainIdRef = useRef<string | null>(null)

  // Auto-sync network to wallet on first connection
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if we've already auto-synced or if there's a user preference
    if (!isConnected || hasNetworkPreference() || hasAutoSyncedRef.current) {
      return
    }

    // Get chain ID from wallet session
    const sessionData = walletConnectSession
    if (!sessionData?.namespaces?.chia?.chains?.[0]) {
      return
    }

    const walletChainId = sessionData.namespaces.chia.chains[0]
    
    // Only auto-sync if chain ID changed (first connection or reconnection)
    if (lastWalletChainIdRef.current === walletChainId) {
      return
    }

    lastWalletChainIdRef.current = walletChainId

    // Extract network from chain ID
    const walletNetwork = chainIdToNetwork(walletChainId)

    // Auto-sync if no user preference exists
    if (!hasNetworkPreference() && walletNetwork !== network) {
      logger.info(`🔄 Auto-syncing network to wallet: ${walletNetwork}`)
      setNetworkState(walletNetwork)
      setStoredNetwork(walletNetwork)
      hasAutoSyncedRef.current = true
    }
  }, [isConnected, walletConnectSession, network])

  // Reset auto-sync flag when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAutoSyncedRef.current = false
      lastWalletChainIdRef.current = null
    }
  }, [isConnected])

  const setNetwork = useCallback(
    async (newNetwork: Network) => {
      if (newNetwork === network || isSwitching) {
        return
      }

      setIsSwitching(true)

      try {
        // Mark as user-selected (not auto-synced)
        hasAutoSyncedRef.current = true

        // Update state
        setNetworkState(newNetwork)
        setStoredNetwork(newNetwork)

        // Clear TanStack Query cache
        queryClient.clear()

        // Clear network mismatch toast tracking
        clearNetworkMismatchTracking()

        // Invalidate WalletConnect SignClient instance to force reinitialization
        queryClient.invalidateQueries({ queryKey: ['walletConnect', 'instance'] })
        
        // Invalidate all wallet queries to force refetch with new network
        queryClient.invalidateQueries({ queryKey: ['walletConnect'] })

        // Invalidate order book data (limit and market orders)
        queryClient.invalidateQueries({ queryKey: ['orderBook'] })
        queryClient.invalidateQueries({ queryKey: ['orderBookDetails'] })

        // Invalidate Dexie API data (pairs, tickers, offers)
        queryClient.invalidateQueries({ queryKey: ['dexie'] })

        logger.info(`🔄 Network switched to: ${newNetwork}`)
      } catch (error) {
        logger.error('❌ Failed to switch network:', error)
        // Revert state on error
        setNetworkState(network)
      } finally {
        setIsSwitching(false)
      }
    },
    [network, isSwitching, queryClient]
  )

  const value: NetworkContextType = {
    network,
    setNetwork,
    isMainnet: network === 'mainnet',
    isTestnet: network === 'testnet',
  }

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}
