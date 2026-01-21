/**
 * Network storage utilities
 * Centralized functions for reading/writing network preference from localStorage
 */

const NETWORK_STORAGE_KEY = 'pengui-network'

/**
 * Get current network from localStorage
 * @param defaultValue - Default network if none is stored (defaults to 'mainnet')
 * @returns The stored network or default
 * 
 * IMPORTANT: Always defaults to 'mainnet' - testnet should only be used when explicitly set by user
 */
export function getStoredNetwork(defaultValue: 'mainnet' | 'testnet' = 'mainnet'): 'mainnet' | 'testnet' {
  if (typeof window === 'undefined') {
    return 'mainnet' // Always default to mainnet on server
  }
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY)
  if(stored==='testnet') return 'testnet';
  return 'mainnet'
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
