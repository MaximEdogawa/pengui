/**
 * Higher-order function to wrap wallet query/mutation functions with network mismatch checking
 * Checks proactively but with guards to prevent false positives on page refresh
 */

import { checkNetworkMismatch } from './networkMismatch'
import type { WalletConnectSession } from '../types/walletConnect.types'

/**
 * Wraps a wallet query/mutation function to check for network mismatch before execution
 * @param fn - The function to wrap
 * @param network - Current app network
 * @param session - Wallet session
 * @returns Wrapped function that checks network mismatch before calling the original
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withNetworkMismatchCheck<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  network: 'mainnet' | 'testnet',
  session: WalletConnectSession
): T {
  return ((...args: Parameters<T>) => {
    // Check for network mismatch before making request
    // Guards prevent false positives during page refresh:
    // 1. Session must be fully initialized (topic not empty)
    // 2. checkNetworkMismatch has its own guards (2-second grace period, etc.)
    if (session.isConnected && session.chainId && session.topic && session.topic.trim() !== '') {
      checkNetworkMismatch(network, session.chainId, session.topic)
    }
    return fn(...args)
  }) as T
}
