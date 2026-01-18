/**
 * Mock implementations for wallet-related functionality
 */

export const mockWalletConnection = {
  isConnected: false,
  address: null as string | null,
  fingerprint: null as number | null,
  session: null as unknown,
}

export function createMockWalletConnection(overrides?: Partial<typeof mockWalletConnection>) {
  return {
    ...mockWalletConnection,
    ...overrides,
  }
}

export const mockWalletConnectSession = {
  topic: 'mock-topic',
  namespaces: {
    chia: {
      chains: ['chia:mainnet'],
      accounts: ['chia:mainnet:1234567890'],
    },
  },
}

export function createMockWalletConnectSession(overrides?: Partial<typeof mockWalletConnectSession>) {
  return {
    ...mockWalletConnectSession,
    ...overrides,
  }
}
