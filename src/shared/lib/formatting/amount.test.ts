import { describe, it, expect } from 'bun:test'
import { formatAmountFromMojos } from './amount'

describe('amount formatting', () => {
  describe('formatAmountFromMojos', () => {
    it('should format mojos as XCH with 6 decimal places', () => {
      const mojos = '1000000000000' // 1 XCH
      expect(formatAmountFromMojos(mojos)).toBe('1.000000')
    })

    it('should format fractional mojos correctly', () => {
      const mojos = '500000000000' // 0.5 XCH
      expect(formatAmountFromMojos(mojos)).toBe('0.500000')
    })

    it('should format small amounts correctly', () => {
      const mojos = '1000000' // 0.000001 XCH
      expect(formatAmountFromMojos(mojos)).toBe('0.000001')
    })

    it('should handle zero', () => {
      expect(formatAmountFromMojos('0')).toBe('0.000000')
    })

    it('should handle large amounts', () => {
      const mojos = '100000000000000' // 100 XCH
      expect(formatAmountFromMojos(mojos)).toBe('100.000000')
    })

    it('should return default value on error', () => {
      expect(formatAmountFromMojos('invalid')).toBe('0.000000')
      expect(formatAmountFromMojos('')).toBe('0.000000')
    })
  })
})
