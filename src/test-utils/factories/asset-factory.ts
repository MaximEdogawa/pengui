/**
 * Factory functions for creating test asset data
 */

export interface TestAsset {
  assetId: string | null
  assetType: 'xch' | 'cat' | 'nft' | 'option'
  name?: string
  symbol?: string
  amount?: number
  balance?: number
}

export function createAsset(overrides?: Partial<TestAsset>): TestAsset {
  return {
    assetId: null,
    assetType: 'xch',
    name: 'Chia',
    symbol: 'XCH',
    amount: 0,
    balance: 0,
    ...overrides,
  }
}

export function createXchAsset(overrides?: Partial<TestAsset>): TestAsset {
  return createAsset({
    assetId: null,
    assetType: 'xch',
    name: 'Chia',
    symbol: 'XCH',
    ...overrides,
  })
}

export function createCatAsset(overrides?: Partial<TestAsset>): TestAsset {
  return createAsset({
    assetId: `0x${'a'.repeat(64)}`,
    assetType: 'cat',
    name: 'Test CAT',
    symbol: 'TCAT',
    ...overrides,
  })
}

export function createNftAsset(overrides?: Partial<TestAsset>): TestAsset {
  return createAsset({
    assetId: `0x${'b'.repeat(64)}`,
    assetType: 'nft',
    name: 'Test NFT',
    ...overrides,
  })
}

export function createAssets(count: number): TestAsset[] {
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) {
      return createXchAsset({ amount: 100, balance: 1000 })
    } else if (i % 2 === 0) {
      return createCatAsset({
        assetId: `0x${i.toString().padStart(64, '0')}`,
        amount: i * 10,
        balance: i * 100,
      })
    } else {
      return createNftAsset({
        assetId: `0x${i.toString().padStart(64, '1')}`,
        amount: i,
        balance: i,
      })
    }
  })
}
