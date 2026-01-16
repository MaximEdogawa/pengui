export const CHIA_MAINNET_CHAIN_ID = 'chia:mainnet'
export const CHIA_TESTNET_CHAIN_ID = 'chia:testnet'

const getCurrentUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'https://pengui.pool'
}

export const environment = {
  appName: 'Penguin Pool',
  appVersion: '1.0.0',
  appDescription: 'Decentralized lending platform on Chia Network',

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  wallet: {
    walletConnect: {
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
      metadata: {
        name: 'Penguin Pool',
        description: 'Decentralized lending platform on Chia Network',
        url: getCurrentUrl(),
        icons: [
          `${getCurrentUrl()}/icons/icon-192x192.png`,
          `${getCurrentUrl()}/icons/icon-512x512.png`,
          `${getCurrentUrl()}/favicon.svg`,
          `${getCurrentUrl()}/pengui-logo.png`,
        ],
      },
      networks: {
        chia: {
          mainnet: CHIA_MAINNET_CHAIN_ID,
          testnet: CHIA_TESTNET_CHAIN_ID,
          current: CHIA_MAINNET_CHAIN_ID, // Default to mainnet
        },
      },
      relayUrl: process.env.NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL || 'wss://relay.walletconnect.com',
    },
  },

  // Dexie API configuration
  dexie: {
    apiBaseUrl: process.env.NEXT_PUBLIC_DEXIE_API_URL || 'https://api-testnet.dexie.space',
  },

  // Database configuration
  database: {
    indexedDB: {
      name: 'pengui-db',
      version: 2, // Updated to version 2 to support network field
    },
  },
} as const

/**
 * Get native token ticker for a specific network
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns 'TXCH' for testnet, 'XCH' for mainnet
 */
export function getNativeTokenTickerForNetwork(network: 'mainnet' | 'testnet'): 'TXCH' | 'XCH' {
  return network === 'testnet' ? 'TXCH' : 'XCH'
}

/**
 * Check if a network is testnet
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns true if testnet, false if mainnet
 */
export function isNetworkTestnet(network: 'mainnet' | 'testnet'): boolean {
  return network === 'testnet'
}

export type Environment = typeof environment
