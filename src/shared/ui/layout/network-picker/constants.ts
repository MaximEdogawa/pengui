/**
 * Network picker constants
 */

export const NETWORK_OPTIONS = [
  { value: 'mainnet' as const, label: 'Mainnet', badge: 'XCH', color: 'bg-green-500' },
  { value: 'testnet' as const, label: 'Testnet', badge: 'TXCH', color: 'bg-yellow-500' },
] as const

export type NetworkOption = typeof NETWORK_OPTIONS[number]
