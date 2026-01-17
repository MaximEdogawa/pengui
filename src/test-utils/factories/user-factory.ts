/**
 * Factory functions for creating test user data
 */

export interface TestUser {
  id: string
  fingerprint: number
  address: string
  name?: string
}

export function createUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: 'user-1',
    fingerprint: 1234567890,
    address: 'xch1test1234567890abcdefghijklmnopqrstuvwxyz',
    name: 'Test User',
    ...overrides,
  }
}

export function createUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, i) =>
    createUser({
      id: `user-${i + 1}`,
      fingerprint: 1234567890 + i,
      address: `xch1test${i.toString().padStart(10, '0')}`,
      name: `Test User ${i + 1}`,
    })
  )
}
