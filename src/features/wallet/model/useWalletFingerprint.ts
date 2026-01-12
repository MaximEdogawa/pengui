// Phase 2: Get fingerprint from wallet connection state
'use client'

import { useAppSelector } from '@maximedogawa/chia-wallet-connect-react'

/**
 * Hook to get the wallet fingerprint from the Redux store
 * The fingerprint is stored in walletConnect.selectedFingerprint as an object
 * with topic keys, or can be extracted from the WalletConnect session
 */
export function useWalletFingerprint(): string | null {
  // Get the selected session topic
  const selectedSession = useAppSelector((state) => state.walletConnect?.selectedSession)

  // Get the fingerprint map (topic -> fingerprint)
  const fingerprintMap = useAppSelector((state) => state.walletConnect?.selectedFingerprint)

  // If we have a selected session and fingerprint map, get the fingerprint for that topic
  if (selectedSession?.topic && fingerprintMap?.[selectedSession.topic]) {
    return String(fingerprintMap[selectedSession.topic])
  }

  // Try to extract fingerprint from session accounts if available
  if (selectedSession?.namespaces?.chia?.accounts?.[0]) {
    const account = selectedSession.namespaces.chia.accounts[0]
    // Account format: "chia:chainId:fingerprint"
    const parts = account.split(':')
    if (parts.length >= 3) {
      return parts[2]
    }
  }

  return null
}
