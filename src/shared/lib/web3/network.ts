/**
 * Network utility functions for converting between chain IDs and network types
 */

export const CHIA_MAINNET_CHAIN_ID = 'chia:mainnet'
export const CHIA_TESTNET_CHAIN_ID = 'chia:testnet'

/**
 * Convert a chain ID to network type
 * @param chainId - The chain ID (e.g., 'chia:mainnet' or 'chia:testnet')
 * @returns The network type ('mainnet' or 'testnet')
 */
export function chainIdToNetwork(chainId: string): 'mainnet' | 'testnet' {
  if (chainId === CHIA_MAINNET_CHAIN_ID) {
    return 'mainnet'
  }
  if (chainId === CHIA_TESTNET_CHAIN_ID) {
    return 'testnet'
  }
  // Default to mainnet if unknown
  return 'mainnet'
}

/**
 * Convert a network type to chain ID
 * @param network - The network type ('mainnet' or 'testnet')
 * @returns The chain ID (e.g., 'chia:mainnet' or 'chia:testnet')
 */
export function networkToChainId(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet' ? CHIA_MAINNET_CHAIN_ID : CHIA_TESTNET_CHAIN_ID
}

/**
 * Get Dexie API URL for a given network
 * @param network - The network type ('mainnet' or 'testnet')
 * @returns The Dexie API base URL
 */
export function getDexieApiUrl(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet'
    ? 'https://api.dexie.space'
    : 'https://api-testnet.dexie.space'
}
