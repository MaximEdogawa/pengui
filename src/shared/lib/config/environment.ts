export const CHIA_MAINNET_CHAIN_ID = 'chia:mainnet'
export const CHIA_TESTNET_CHAIN_ID = 'chia:testnet'

const getCurrentUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'https://penguin.pool'
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
          current: (() => {
            const network = process.env.NEXT_PUBLIC_CHIA_NETWORK || 'testnet'
            return network === 'mainnet' ? CHIA_MAINNET_CHAIN_ID : CHIA_TESTNET_CHAIN_ID
          })(),
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
      version: 1,
    },
  },
} as const

/**
 * Get the current Chia network (mainnet or testnet)
 */
export function getChiaNetwork(): 'mainnet' | 'testnet' {
  const network = process.env.NEXT_PUBLIC_CHIA_NETWORK || 'testnet'
  return network === 'mainnet' ? 'mainnet' : 'testnet'
}

/**
 * Check if the current network is testnet
 */
export function isTestnet(): boolean {
  return getChiaNetwork() === 'testnet'
}

/**
 * Get the native token ticker based on the current network
 * Returns 'TXCH' for testnet, 'XCH' for mainnet
 */
export function getNativeTokenTicker(): 'TXCH' | 'XCH' {
  return isTestnet() ? 'TXCH' : 'XCH'
}

export type Environment = typeof environment
