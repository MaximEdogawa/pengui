/**
 * Network mismatch detection and toast management
 */

import { networkToChainId, chainIdToNetwork } from '@/shared/lib/utils/networkUtils'
import { toast } from '@/hooks/use-toast'

// Track shown toasts to prevent spam
// This Set persists across page refreshes in the same session, but gets cleared on page load
const shownToasts = new Set<string>()

// Track page load time to prevent checks during initial sync period (first 1 second)
// This gives time for network auto-sync to complete after page refresh
let pageLoadTime: number | null = null
const INITIAL_SYNC_GRACE_PERIOD = 1000 // 1 second

if (typeof window !== 'undefined') {
  // Use a flag to ensure we only clear once per page load
  const clearKey = '__networkMismatchCleared'
  const pageLoadTimeKey = '__networkMismatchPageLoadTime'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wasCleared = (window as any)[clearKey]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedTime = (window as any)[pageLoadTimeKey] as number | undefined

  if (!wasCleared) {
    // First time on this page load - clear toasts and set time
    shownToasts.clear()
    pageLoadTime = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)[clearKey] = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)[pageLoadTimeKey] = pageLoadTime
  } else if (savedTime) {
    // Already initialized - use saved time
    pageLoadTime = savedTime
  }
}

/**
 * Check if there's a network mismatch and show toast if needed
 * Compares appNetwork (converted to chain ID) with walletChainId
 * @param appNetwork - The current app network ('mainnet' | 'testnet')
 * @param walletChainId - The wallet's chain ID (e.g., 'chia:mainnet' | 'chia:testnet')
 * @param sessionTopic - The wallet session topic (for deduplication)
 * @returns true if there's a mismatch, false otherwise
 */
export function checkNetworkMismatch(
  appNetwork: 'mainnet' | 'testnet',
  walletChainId: string,
  sessionTopic: string
): boolean {
  // Early return if session is not fully initialized
  if (!sessionTopic || sessionTopic.trim() === '') {
    return false
  }

  // Early return if chainId is not valid
  if (!walletChainId || walletChainId.trim() === '') {
    return false
  }

  // Prevent checks during initial sync period (first 1 second after page load)
  // This gives time for network auto-sync to complete after page refresh
  if (pageLoadTime !== null) {
    const timeSinceLoad = Date.now() - pageLoadTime
    if (timeSinceLoad < INITIAL_SYNC_GRACE_PERIOD) {
      return false
    }
  }

  // Convert app network to expected chain ID and compare with wallet's chain ID
  const expectedChainId = networkToChainId(appNetwork)
  if (expectedChainId === walletChainId) {
    return false // Networks match, no mismatch
  }

  // Networks don't match - show toast once per refresh or network switch
  // Key is based on the mismatch itself (cleared on page load and network switch)
  const toastKey = `${walletChainId}-${appNetwork}`
  if (!shownToasts.has(toastKey)) {
    shownToasts.add(toastKey)

    // Convert wallet chain ID to network name for display
    const walletNetwork = chainIdToNetwork(walletChainId)
    const appNetworkName = appNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'
    const walletNetworkName = walletNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'

    toast({
      variant: 'destructive',
      title: 'Network Mismatch',
      description: `Wallet is on ${walletNetworkName} but app is on ${appNetworkName}. Wallet requests will use the wallet's network.`,
    })
  }

  return true // Mismatch detected
}

/**
 * Clear toast tracking (called on page load and when network changes)
 * This allows the toast to show once per refresh and once per network switch
 */
export function clearNetworkMismatchTracking(): void {
  shownToasts.clear()
}
