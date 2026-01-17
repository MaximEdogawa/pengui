import { describe, it, expect } from 'bun:test'
import {
  xchToMojos,
  mojosToXch,
  formatXchAmount,
  formatMojosAsXch,
  getMinimumFeeInXch,
  isValidChiaAddress,
  formatAssetAmount,
  convertToSmallestUnit,
  convertFromSmallestUnit,
  assetInputAmounts,
  formatAssetAmountForInput,
  getAmountPlaceholder,
  MOJOS_PER_XCH,
} from './chia-units'

describe('xchToMojos', () => {
    it('should convert XCH to mojos correctly', () => {
      expect(xchToMojos(1)).toBe(MOJOS_PER_XCH)
      expect(xchToMojos(0.5)).toBe(MOJOS_PER_XCH / 2)
      expect(xchToMojos(0.000001)).toBe(1_000_000)
      expect(xchToMojos(0)).toBe(0)
    })

    it('should handle string amounts', () => {
      expect(xchToMojos(parseFloat('1'))).toBe(MOJOS_PER_XCH)
      expect(xchToMojos(parseFloat('0.5'))).toBe(MOJOS_PER_XCH / 2)
    })
  })

  describe('mojosToXch', () => {
    it('should convert mojos to XCH correctly', () => {
      expect(mojosToXch(MOJOS_PER_XCH)).toBe(1)
      expect(mojosToXch(MOJOS_PER_XCH / 2)).toBe(0.5)
      expect(mojosToXch(1_000_000)).toBe(0.000001)
      expect(mojosToXch(0)).toBe(0)
    })

    it('should handle string mojos', () => {
      expect(mojosToXch(String(MOJOS_PER_XCH))).toBe(1)
      expect(mojosToXch('1000000000000')).toBe(1)
    })

    it('should handle bigint mojos', () => {
      expect(mojosToXch(BigInt(MOJOS_PER_XCH))).toBe(1)
      expect(mojosToXch(BigInt(0))).toBe(0)
    })
  })

  describe('formatXchAmount', () => {
    it('should format XCH amounts with default precision', () => {
      expect(formatXchAmount(1)).toBe('1.000000')
      expect(formatXchAmount(0.5)).toBe('0.500000')
      expect(formatXchAmount(0.123456)).toBe('0.123456')
    })

    it('should format with custom precision', () => {
      expect(formatXchAmount(1, 2)).toBe('1.00')
      expect(formatXchAmount(0.123456, 3)).toBe('0.123')
    })

    it('should handle invalid numbers', () => {
      expect(formatXchAmount(NaN)).toBe('0.000000')
      expect(formatXchAmount('invalid' as unknown as number)).toBe('0.000000')
    })

    it('should handle numeric string amounts', () => {
      // Note: formatXchAmount accepts AssetAmount (number), but internally handles strings
      // Testing with type assertion to verify internal string handling
      expect(formatXchAmount('1' as unknown as number)).toBe('1.000000')
      expect(formatXchAmount('0.5' as unknown as number)).toBe('0.500000')
    })
  })

  describe('formatMojosAsXch', () => {
    it('should format mojos as XCH', () => {
      expect(formatMojosAsXch(MOJOS_PER_XCH)).toBe('1.000000')
      expect(formatMojosAsXch(MOJOS_PER_XCH / 2)).toBe('0.500000')
    })
  })

  describe('getMinimumFeeInXch', () => {
    it('should return minimum fee', () => {
      expect(getMinimumFeeInXch()).toBe(0.000001)
    })
  })

  describe('isValidChiaAddress', () => {
    it('should validate mainnet addresses', () => {
      // Valid Chia address format: xch1 followed by exactly 58 alphanumeric characters
      expect(isValidChiaAddress(`xch1${'a'.repeat(58)}`)).toBe(true)
      expect(isValidChiaAddress(`xch1${'1'.repeat(58)}`)).toBe(true)
      // Generate exactly 58 characters: 'a1b2c3' is 6 chars, repeat 10 times = 60, substring to 58
      expect(isValidChiaAddress(`xch1${'a1b2c3'.repeat(10).substring(0, 58)}`)).toBe(true)
    })

    it('should validate testnet addresses', () => {
      // Valid testnet Chia address format: txch1 followed by exactly 58 alphanumeric characters
      expect(isValidChiaAddress(`txch1${'a'.repeat(58)}`)).toBe(true)
      expect(isValidChiaAddress(`txch1${'1'.repeat(58)}`)).toBe(true)
    })

    it('should reject invalid addresses', () => {
      expect(isValidChiaAddress('invalid')).toBe(false)
      expect(isValidChiaAddress('xch1short')).toBe(false)
      expect(isValidChiaAddress('btc1test1234567890abcdefghijklmnopqrstuvwxyz1234567890')).toBe(false)
      expect(isValidChiaAddress('')).toBe(false)
      // Wrong length
      expect(isValidChiaAddress(`xch1${'a'.repeat(57)}`)).toBe(false)
      expect(isValidChiaAddress(`xch1${'a'.repeat(59)}`)).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(isValidChiaAddress(` xch1${'a'.repeat(58)} `)).toBe(true)
    })
  })

  describe('formatAssetAmount', () => {
    it('should format XCH amounts', () => {
      expect(formatAssetAmount(1, 'xch')).toBe('1.000000')
      expect(formatAssetAmount(0.5, 'xch')).toBe('0.500000')
    })

    it('should format CAT amounts', () => {
      expect(formatAssetAmount(1, 'cat')).toBe('1.000')
      expect(formatAssetAmount(0.123, 'cat')).toBe('0.123')
    })

    it('should format NFT amounts', () => {
      expect(formatAssetAmount(1, 'nft')).toBe('1')
      expect(formatAssetAmount(1.5, 'nft')).toBe('1')
      expect(formatAssetAmount(10, 'nft')).toBe('10')
    })

    it('should handle invalid numbers', () => {
      expect(formatAssetAmount(NaN, 'xch')).toBe('0')
      expect(formatAssetAmount('invalid' as unknown as number, 'xch')).toBe('0')
    })

    it('should handle case-insensitive asset types', () => {
      // formatAssetAmount converts to lowercase internally, so uppercase should work
      expect(formatAssetAmount(1, 'XCH' as 'xch')).toBe('1.000000')
      expect(formatAssetAmount(1, 'Cat' as 'cat')).toBe('1.000')
    })
  })

  describe('convertToSmallestUnit', () => {
    it('should convert XCH to mojos', () => {
      expect(convertToSmallestUnit(1, 'xch')).toBe(MOJOS_PER_XCH)
      expect(convertToSmallestUnit(0.5, 'xch')).toBe(MOJOS_PER_XCH / 2)
    })

    it('should convert CAT to smallest units', () => {
      expect(convertToSmallestUnit(1, 'cat')).toBe(1000)
      expect(convertToSmallestUnit(0.5, 'cat')).toBe(500)
    })

    it('should convert NFT to whole numbers', () => {
      expect(convertToSmallestUnit(1, 'nft')).toBe(1)
      expect(convertToSmallestUnit(1.5, 'nft')).toBe(1)
    })
  })

  describe('convertFromSmallestUnit', () => {
    it('should convert mojos to XCH', () => {
      expect(convertFromSmallestUnit(MOJOS_PER_XCH, 'xch')).toBe(1)
      expect(convertFromSmallestUnit(MOJOS_PER_XCH / 2, 'xch')).toBe(0.5)
    })

    it('should convert CAT smallest units to display units', () => {
      expect(convertFromSmallestUnit(1000, 'cat')).toBe(1)
      expect(convertFromSmallestUnit(500, 'cat')).toBe(0.5)
    })

    it('should handle string and bigint inputs', () => {
      expect(convertFromSmallestUnit(String(MOJOS_PER_XCH), 'xch')).toBe(1)
      expect(convertFromSmallestUnit(BigInt(MOJOS_PER_XCH), 'xch')).toBe(1)
    })
  })

  describe('assetInputAmounts.isValid', () => {
    it('should allow empty string', () => {
      expect(assetInputAmounts.isValid('')).toBe(true)
    })

    it('should reject negative numbers', () => {
      expect(assetInputAmounts.isValid('-1')).toBe(false)
      expect(assetInputAmounts.isValid('-0.5')).toBe(false)
    })

    it('should validate XCH amounts (up to 12 decimals)', () => {
      expect(assetInputAmounts.isValid('1', 'xch')).toBe(true)
      expect(assetInputAmounts.isValid('1.123456789012', 'xch')).toBe(true)
      expect(assetInputAmounts.isValid('1.1234567890123', 'xch')).toBe(false) // 13 decimals
    })

    it('should validate CAT amounts (up to 3 decimals)', () => {
      expect(assetInputAmounts.isValid('1', 'cat')).toBe(true)
      expect(assetInputAmounts.isValid('1.123', 'cat')).toBe(true)
      expect(assetInputAmounts.isValid('1.1234', 'cat')).toBe(false) // 4 decimals
    })

    it('should validate NFT amounts (integers only)', () => {
      expect(assetInputAmounts.isValid('1', 'nft')).toBe(true)
      expect(assetInputAmounts.isValid('123', 'nft')).toBe(true)
      expect(assetInputAmounts.isValid('1.5', 'nft')).toBe(false)
      expect(assetInputAmounts.isValid('1.0', 'nft')).toBe(false)
    })

    it('should reject multiple decimal points', () => {
      expect(assetInputAmounts.isValid('1.2.3')).toBe(false)
    })
  })

  describe('assetInputAmounts.parse', () => {
    it('should parse empty string as 0', () => {
      expect(assetInputAmounts.parse('')).toBe(0)
      expect(assetInputAmounts.parse('.')).toBe(0)
    })

    it('should parse valid numbers', () => {
      expect(assetInputAmounts.parse('1')).toBe(1)
      expect(assetInputAmounts.parse('1.5')).toBe(1.5)
      expect(assetInputAmounts.parse('0.123')).toBe(0.123)
    })

    it('should parse NFT as integer', () => {
      expect(assetInputAmounts.parse('1', 'nft')).toBe(1)
      expect(assetInputAmounts.parse('1.5', 'nft')).toBe(1) // Floors to integer
      expect(assetInputAmounts.parse('123', 'nft')).toBe(123)
    })

    it('should handle invalid input', () => {
      expect(assetInputAmounts.parse('invalid')).toBe(0)
      expect(assetInputAmounts.parse('-1')).toBe(0)
    })
  })

  describe('formatAssetAmountForInput', () => {
    it('should format whole numbers without decimals', () => {
      expect(formatAssetAmountForInput(1, 'xch')).toBe('1')
      expect(formatAssetAmountForInput(10, 'cat')).toBe('10')
    })

    it('should format decimals for XCH', () => {
      expect(formatAssetAmountForInput(1.123456789012, 'xch')).toBe('1.123456789012')
      expect(formatAssetAmountForInput(0.5, 'xch')).toBe('0.5')
    })

    it('should format decimals for CAT', () => {
      expect(formatAssetAmountForInput(1.123, 'cat')).toBe('1.123')
      expect(formatAssetAmountForInput(0.5, 'cat')).toBe('0.5')
    })

    it('should format NFT as integer', () => {
      expect(formatAssetAmountForInput(1, 'nft')).toBe('1')
      expect(formatAssetAmountForInput(1.5, 'nft')).toBe('1')
    })

    it('should return empty string for 0', () => {
      expect(formatAssetAmountForInput(0, 'xch')).toBe('')
      expect(formatAssetAmountForInput(0, 'cat')).toBe('')
    })
  })

  describe('getAmountPlaceholder', () => {
    it('should return correct placeholders', () => {
      expect(getAmountPlaceholder('xch')).toBe('0.000000')
      expect(getAmountPlaceholder('cat')).toBe('0.000')
      expect(getAmountPlaceholder('nft')).toBe('0')
    })
  })
