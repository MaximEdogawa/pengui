'use client'

import { useAppSelector, useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { CHIA_TESTNET_CHAIN_ID } from '@/shared/lib/walletConnect/constants/wallet-connect'
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

  const session = useMemo(() => {
    // Use walletConnectSession from the hook if available, otherwise fall back to selectedSession
    const sessionData = walletConnectSession || selectedSession

    if (!sessionData || !isConnected) {
      return {
        session: null,
        chainId: CHIA_TESTNET_CHAIN_ID,
        fingerprint: 0,
        topic: '',
        isConnected: false,
      }
    }

    const chains = sessionData.namespaces.chia?.chains
    const chainId = chains && chains.length > 0 ? chains[0] : CHIA_TESTNET_CHAIN_ID

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
  }, [walletConnectSession, selectedSession, fingerprintMap, isConnected])

  return session
}
