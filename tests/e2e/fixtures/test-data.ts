/**
 * Test data fixtures for E2E tests
 * Centralized test data to ensure consistency across tests
 */

export const testUsers = {
  mainnet: {
    address: 'xch1test1234567890abcdefghijklmnopqrstuvwxyz1234567890',
    fingerprint: 1234567890,
  },
  testnet: {
    address: 'txch1test1234567890abcdefghijklmnopqrstuvwxyz1234567890',
    fingerprint: 9876543210,
  },
}

export const testAssets = {
  xch: {
    assetId: null,
    assetType: 'xch' as const,
    name: 'Chia',
    symbol: 'XCH',
    balance: 1000,
  },
  cat: {
    assetId: `0x${'a'.repeat(64)}`,
    assetType: 'cat' as const,
    name: 'Test CAT',
    symbol: 'TCAT',
    balance: 5000,
  },
}

export const testNetworks = {
  mainnet: 'mainnet',
  testnet: 'testnet',
} as const
