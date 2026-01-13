/**
 * Network mismatch detection and toast management
 */

import { networkToChainId, chainIdToNetwork } from '@/shared/lib/utils/networkUtils'
import { toast } from '@/hooks/use-toast'

// Track shown toasts to prevent spam
const shownToasts = new Set<string>()

/**
 * Check if there's a network mismatch and show toast if needed
 * @param appNetwork - The current app network
 * @param walletChainId - The wallet's chain ID
 * @param sessionTopic - The wallet session topic (for deduplication)
 * @returns true if there's a mismatch, false otherwise
 */
export function checkNetworkMismatch(
  appNetwork: 'mainnet' | 'testnet',
  walletChainId: string,
  sessionTopic: string
): boolean {
  const expectedChainId = networkToChainId(appNetwork)
  const walletNetwork = chainIdToNetwork(walletChainId)

  // Check if networks match
  if (expectedChainId === walletChainId) {
    return false // No mismatch
  }

  // Create unique key for deduplication
  const toastKey = `${sessionTopic}-${walletChainId}`

  // Only show toast once per session+network combo
  if (!shownToasts.has(toastKey)) {
    shownToasts.add(toastKey)

    toast({
      variant: 'destructive',
      title: 'Network Mismatch',
      description: `Wallet is on ${walletNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'} but app is on ${appNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}. Please switch networks or reconnect your wallet.`,
    })
  }

  return true // Mismatch detected
}

/**
 * Clear toast tracking for a session (called when wallet disconnects or network changes)
 * @param sessionTopic - The wallet session topic
 */
export function clearNetworkMismatchTracking(sessionTopic?: string): void {
  if (sessionTopic) {
    // Clear all toasts for this session
    const keysToRemove: string[] = []
    shownToasts.forEach((key) => {
      if (key.startsWith(`${sessionTopic}-`)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach((key) => shownToasts.delete(key))
  } else {
    // Clear all toasts
    shownToasts.clear()
  }
}
