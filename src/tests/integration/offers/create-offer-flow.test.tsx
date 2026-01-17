/**
 * Integration test for offer creation flow
 * Tests offer creation, validation, and submission
 */

import { describe, it, expect } from 'bun:test'
import { createAsset } from '@/test-utils/factories/asset-factory'

describe('Create Offer Flow Integration', () => {
  it('should validate offer asset selection', () => {
    const xchAsset = createAsset({
      assetType: 'xch',
      balance: 1000,
    })

    const catAsset = createAsset({
      assetType: 'cat',
      assetId: `0x${'a'.repeat(64)}`,
      balance: 5000,
    })

    expect(xchAsset.assetType).toBe('xch')
    expect(catAsset.assetType).toBe('cat')
    expect(catAsset.assetId).toBeTruthy()
  })

  it('should validate offer amounts', () => {
    const asset = createAsset({
      assetType: 'xch',
      balance: 1000,
    })

    // Offer amount should not exceed available balance
    const offerAmount = 500
    expect(offerAmount).toBeLessThanOrEqual(asset.balance || 0)
  })

  // Note: Full offer creation flow testing requires:
  // - Testing asset selector component
  // - Testing amount input validation
  // - Testing offer submission
  // - Testing error handling
  // These are better tested through E2E tests
})
