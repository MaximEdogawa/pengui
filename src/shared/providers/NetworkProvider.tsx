'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { chainIdToNetwork, networkToChainId } from '@/shared/lib/utils/networkUtils'
import { getStoredNetwork, setStoredNetwork, hasNetworkPreference } from '@/shared/lib/utils/networkStorage'
import { clearNetworkMismatchTracking, checkNetworkMismatch } from '@/shared/lib/walletConnect/utils/networkMismatch'
import { getAssetBalance } from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { logger } from '@/shared/lib/logger'
import { useAppSelector } from '@maximedogawa/chia-wallet-connect-react'
import { trackEffectRun } from '@/shared/lib/utils/useEffectGuard'

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
  const selectedSession = useAppSelector((state) => state.walletConnect?.selectedSession)
  const [network, setNetworkState] = useState<Network>(() => getStoredNetwork('mainnet'))
  const [isSwitching, setIsSwitching] = useState(false)
  const hasAutoSyncedRef = useRef(false)
  const lastWalletChainIdRef = useRef<string | null>(null)
  const testRequestTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-sync network to wallet on first connection
  // ⚠️ CRITICAL: Do NOT include 'network' in dependency array!
  // Including 'network' here causes infinite loops because setNetworkState() updates 'network',
  // which triggers this effect again. Use getStoredNetwork() to read current value instead.
  // See: docs/development/infinite-loop-guardrails.md
  useEffect(() => {
    trackEffectRun('NetworkProvider: auto-sync')
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

    // Get current network from state (don't use dependency to avoid re-renders)
    const currentNetwork = getStoredNetwork('mainnet')

    // Auto-sync if no user preference exists and networks differ
    if (!hasNetworkPreference() && walletNetwork !== currentNetwork) {
      logger.info(`🔄 Auto-syncing network to wallet: ${walletNetwork}`)
      setNetworkState(walletNetwork)
      setStoredNetwork(walletNetwork)
      hasAutoSyncedRef.current = true
      // Clear mismatch tracking after successful auto-sync
      // This prevents false positives if a mismatch was detected before sync
      clearNetworkMismatchTracking()
    }
  }, [isConnected, walletConnectSession])

  // Reset auto-sync flag when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAutoSyncedRef.current = false
      lastWalletChainIdRef.current = null
      // Clear test request timeout if wallet disconnects
      if (testRequestTimeoutRef.current) {
        clearTimeout(testRequestTimeoutRef.current)
        testRequestTimeoutRef.current = null
      }
    }
  }, [isConnected])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (testRequestTimeoutRef.current) {
        clearTimeout(testRequestTimeoutRef.current)
      }
    }
  }, [])

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

        // After network switch, test wallet connection with a balance request
        // If it fails, show network mismatch toast
        if (isConnected && walletConnectSession) {
          // Clear any existing timeout
          if (testRequestTimeoutRef.current) {
            clearTimeout(testRequestTimeoutRef.current)
          }

          // Wait a bit for the network switch to complete, then test the connection
          testRequestTimeoutRef.current = setTimeout(async () => {
            try {
              // Try to get SignClient from cache (may need to wait for it to initialize)
              // Try both old and new network keys in case the new one isn't ready yet
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let instanceData = queryClient.getQueryData<{ signClient: any }>(['walletConnect', 'instance', newNetwork])
              if (!instanceData) {
                // Fallback to old network's SignClient (it should still work)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                instanceData = queryClient.getQueryData<{ signClient: any }>(['walletConnect', 'instance', network])
              }
              const signClient = instanceData?.signClient

              if (!signClient) {
                logger.warn('⚠️ SignClient not available for network test')
                return
              }

              // Get session data
              const sessionData = walletConnectSession || selectedSession
              if (!sessionData) {
                logger.warn('⚠️ Session not available for network test')
                return
              }

              // Extract chainId from session
              const chains = sessionData.namespaces?.chia?.chains
              const accounts = sessionData.namespaces?.chia?.accounts
              let walletChainId: string

              if (chains && chains.length > 0) {
                walletChainId = chains[0]
              } else if (accounts && accounts.length > 0) {
                const accountParts = accounts[0].split(':')
                if (accountParts.length >= 4 && accountParts[1] === 'chia') {
                  walletChainId = `chia:${accountParts[2]}`
                } else if (accountParts.length >= 3) {
                  if (accountParts[1] === 'chia') {
                    walletChainId = `chia:${accountParts[2]}`
                  } else {
                    walletChainId = `chia:${accountParts[1]}`
                  }
                } else {
                  walletChainId = networkToChainId(newNetwork)
                }
              } else {
                walletChainId = networkToChainId(newNetwork)
              }

              // Create a minimal session object for the request
              const testSession = {
                session: sessionData,
                chainId: walletChainId,
                fingerprint: accounts && accounts.length > 0
                  ? parseInt(accounts[0].split(':')[accounts[0].split(':').length - 1] || '0')
                  : 0,
                topic: sessionData.topic,
                isConnected: true,
              }

              // Try to get wallet balance as a test request
              const result = await getAssetBalance(signClient, testSession, null, null)

              // If request failed, check if there's actually a network mismatch
              if (!result.success) {
                logger.warn(`⚠️ Wallet request failed after network switch: ${result.error}`)
                // Only show mismatch toast if there's an actual network mismatch and session is initialized
                const expectedChainId = networkToChainId(newNetwork)
                if (walletChainId !== expectedChainId && sessionData.topic && sessionData.topic.trim() !== '') {
                  checkNetworkMismatch(newNetwork, walletChainId, sessionData.topic)
                }
                // If networks match but request failed, don't show toast (might be other issues)
              } else {
                logger.info('✅ Wallet request succeeded after network switch')
                // Request succeeded, do nothing (no toast)
              }
            } catch (error) {
              logger.error('❌ Error testing wallet connection after network switch:', error)
              // On error, only show mismatch toast if there's an actual network mismatch
              const sessionData = walletConnectSession || selectedSession
              if (sessionData && sessionData.topic && sessionData.topic.trim() !== '') {
                const chains = sessionData.namespaces?.chia?.chains
                const walletChainId = chains && chains.length > 0 ? chains[0] : networkToChainId(newNetwork)
                const expectedChainId = networkToChainId(newNetwork)
                // Only show toast if there's an actual mismatch
                if (walletChainId !== expectedChainId) {
                  checkNetworkMismatch(newNetwork, walletChainId, sessionData.topic)
                }
                // If networks match but error occurred, don't show toast (might be other issues)
              }
            }
          }, 500) // Wait 500ms for network switch to complete
        }
      } catch (error) {
        logger.error('❌ Failed to switch network:', error)
        // Revert state on error
        setNetworkState(network)
      } finally {
        setIsSwitching(false)
      }
    },
    [network, isSwitching, queryClient, isConnected, walletConnectSession, selectedSession]
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
