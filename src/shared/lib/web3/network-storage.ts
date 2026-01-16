/**
 * Network storage utilities
 * Centralized functions for reading/writing network preference from localStorage
 */

const NETWORK_STORAGE_KEY = 'pengui-network'

/**
 * Get current network from localStorage
 * @param defaultValue - Default network if none is stored (defaults to 'mainnet')
 * @returns The stored network or default
 */
export function getStoredNetwork(defaultValue: 'mainnet' | 'testnet' = 'mainnet'): 'mainnet' | 'testnet' {
  if (typeof window === 'undefined') {
    return defaultValue
  }
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY)
  return (stored === 'mainnet' || stored === 'testnet' ? stored : defaultValue) as 'mainnet' | 'testnet'
}

/**
 * Set network in localStorage
 * @param network - The network to store
 */
export function setStoredNetwork(network: 'mainnet' | 'testnet'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NETWORK_STORAGE_KEY, network)
  }
}

/**
 * Check if a user preference exists in localStorage
 * @returns true if a preference exists, false otherwise
 */
export function hasNetworkPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem(NETWORK_STORAGE_KEY) !== null
}
