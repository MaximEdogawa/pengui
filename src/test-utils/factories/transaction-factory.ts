/**
 * Factory functions for creating test transaction data
 */

export interface TestTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  name: string
  date: string
  assetId?: string
  assetType?: 'xch' | 'cat' | 'nft'
}

export function createTransaction(
  overrides?: Partial<TestTransaction>
): TestTransaction {
  return {
    id: `tx-${Date.now()}`,
    type: 'income',
    amount: 100,
    name: 'Test Transaction',
    date: new Date().toISOString(),
    assetType: 'xch',
    ...overrides,
  }
}

export function createTransactions(count: number): TestTransaction[] {
  return Array.from({ length: count }, (_, i) =>
    createTransaction({
      id: `tx-${i + 1}`,
      type: i % 2 === 0 ? 'income' : 'expense',
      amount: (i + 1) * 100,
      name: `Transaction ${i + 1}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
    })
  )
}
