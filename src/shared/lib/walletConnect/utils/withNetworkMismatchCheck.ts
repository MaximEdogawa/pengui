/**
 * Higher-order function to wrap wallet query/mutation functions with network mismatch checking
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
export function withNetworkMismatchCheck<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  network: 'mainnet' | 'testnet',
  session: WalletConnectSession
): T {
  return ((...args: Parameters<T>) => {
    // Check for network mismatch before making request
    // Note: We show a toast but don't block the request - the wallet will handle the error
    if (session.isConnected && session.chainId) {
      checkNetworkMismatch(network, session.chainId, session.topic)
    }
    return fn(...args)
  }) as T
}
