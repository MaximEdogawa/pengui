'use client'

import { useAppSelector, useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { CHIA_MAINNET_CHAIN_ID, CHIA_TESTNET_CHAIN_ID } from '@/shared/lib/walletConnect/constants/wallet-connect'
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
    // Always use the app's network chainId for requests, not the wallet's chainId
    // This ensures requests work correctly when the app network changes
    // The wallet will handle the request based on what network it's actually on
    const chainId = defaultChainId

    const accounts = sessionData.namespaces.chia?.accounts
    const fingerprint =
      accounts && accounts.length > 0
        ? parseInt(accounts[0].split(':')[2] || '0')
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
