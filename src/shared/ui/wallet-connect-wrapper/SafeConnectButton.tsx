'use client'

import { ConnectButton } from '@maximedogawa/chia-wallet-connect-react'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useEffect, useState } from 'react'
import { getStoredNetwork, hasNetworkPreference, setStoredNetwork } from '@/shared/lib/utils/networkStorage'
import { networkToChainId } from '@/shared/lib/utils/networkUtils'
import { getRequiredNamespaces } from '@/shared/lib/walletConnect/constants/wallet-connect'

/**
 * SafeConnectButton - Wrapper around ConnectButton that ensures correct network configuration
 * 
 * This component:
 * 1. Ensures network is set before rendering ConnectButton
 * 2. Validates network configuration
 * 3. Prevents WalletConnect initialization with wrong chain ID
 * 4. Provides error handling for connection issues
 */
export function SafeConnectButton() {
  const { network, setNetwork } = useNetwork()
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ensure network is set before allowing WalletConnect operations
    if (typeof window === 'undefined') {
      return
    }

    try {
      if (!hasNetworkPreference()) {
        setStoredNetwork('mainnet')
      }

      const currentNetwork = getStoredNetwork()
      const chainId = networkToChainId(currentNetwork)
      const requiredNamespaces = getRequiredNamespaces(currentNetwork)

      // Validate that required namespaces have the correct chain ID
      const expectedChainId = requiredNamespaces.chia.chains[0]
      if (expectedChainId !== chainId) {
        setError(`Chain ID mismatch: expected ${chainId}, but requiredNamespaces has ${expectedChainId}`)
        return
      }

      setIsReady(true)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
    }
  }, [network])

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
        <p className="text-red-400 text-sm font-medium">Connection Error</p>
        <p className="text-red-300 text-xs">{error}</p>
        <button
          onClick={() => {
            setError(null)
            setIsReady(false)
            // Force re-initialization by updating React state
            // This will trigger the useEffect which depends on network
            const currentNetwork = getStoredNetwork()
            setNetwork(currentNetwork === 'mainnet' ? 'testnet' : 'mainnet')
            // Immediately set back to trigger validation
            setTimeout(() => {
              setNetwork(currentNetwork)
            }, 0)
          }}
          className="text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Only render ConnectButton when ready
  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-400">Initializing wallet connection...</div>
      </div>
    )
  }

  return <ConnectButton />
}
