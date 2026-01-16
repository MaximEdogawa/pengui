'use client'

import { useAppSelector, useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { networkToChainId } from '@/shared/lib/utils/networkUtils'
import type { WalletConnectSession } from '@/shared/lib/walletConnect/types/walletConnect.types'
import { useMemo } from 'react'

/**
 * Hook to get the current WalletConnect session data
 * Extracts session information from the Redux store
 */
export function useWalletSession(): WalletConnectSession {
  const { isConnected, walletConnectSession } = useWalletConnectionState()
  const selectedSession = useAppSelector((state) => state.walletConnect?.selectedSession)
  const fingerprintMap = useAppSelector((state) => state.walletConnect?.selectedFingerprint)
  const { network } = useNetwork()

  const session = useMemo(() => {
    // Use walletConnectSession from the hook if available, otherwise fall back to selectedSession
    const sessionData = walletConnectSession || selectedSession

    // Default chain ID based on current network
    const defaultChainId = networkToChainId(network)

    if (!sessionData || !isConnected) {
      return {
        session: null,
        chainId: defaultChainId,
        fingerprint: 0,
        topic: '',
        isConnected: false,
      }
    }

    const chains = sessionData.namespaces.chia?.chains
    const accounts = sessionData.namespaces.chia?.accounts
    
    // Use the wallet's actual chainId from the session to ensure requests work
    // Priority: 1) chains array, 2) extract from accounts, 3) fallback to app network
    let walletChainId: string
    if (chains && chains.length > 0) {
      // Use the chainId from the session's chains array (most reliable)
      walletChainId = chains[0]
    } else if (accounts && accounts.length > 0) {
      // Try to extract chainId from accounts if chains array is empty
      // Account format can be: "chia:chainId:fingerprint" or "chia:mainnet:fingerprint"
      // Example: "chia:chia:mainnet:12345" or "chia:mainnet:12345"
      const accountParts = accounts[0].split(':')
      if (accountParts.length >= 4 && accountParts[1] === 'chia') {
        // Format: chia:chia:mainnet:fingerprint
        const networkPart = accountParts[2] // "mainnet" or "testnet"
        walletChainId = `chia:${networkPart}`
      } else if (accountParts.length >= 3) {
        // Format: chia:mainnet:fingerprint (3-part format)
        // If parts[1] is "chia", use parts[2] as network; otherwise use parts[1] as network
        if (accountParts[1] === 'chia') {
          walletChainId = `chia:${accountParts[2]}`
        } else {
          walletChainId = `chia:${accountParts[1]}`
        }
      } else if (accountParts.length >= 2) {
        // Fallback: try to construct from what we have
        walletChainId = `chia:${accountParts[1]}`
      } else {
        walletChainId = defaultChainId
      }
    } else {
      // Last resort: use app's network chainId
      walletChainId = defaultChainId
    }
    const chainId = walletChainId
    const fingerprint =
      accounts && accounts.length > 0
        ? (() => {
            // Account format can vary, try to extract fingerprint
            // Format: "chia:chainId:fingerprint" or "chia:mainnet:fingerprint"
            const accountParts = accounts[0].split(':')
            if (accountParts.length >= 4) {
              // Format: chia:chia:mainnet:fingerprint
              const parsed = parseInt(accountParts[3] || '0', 10)
              return Number.isNaN(parsed) ? 0 : parsed
            } else if (accountParts.length >= 3) {
              // Format: chia:mainnet:fingerprint
              const parsed = parseInt(accountParts[2] || '0', 10)
              return Number.isNaN(parsed) ? 0 : parsed
            }
            return 0
          })()
        : fingerprintMap?.[sessionData.topic] || 0

    return {
      session: sessionData,
      chainId,
      fingerprint,
      topic: sessionData.topic,
      isConnected: true,
    }
  }, [walletConnectSession, selectedSession, fingerprintMap, isConnected, network])

  return session
}
