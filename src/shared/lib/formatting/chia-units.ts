/**
 * Chia unit conversion utilities
 *
 * Chia uses mojos as the base unit:
 * - 1 XCH = 1,000,000,000,000 mojos (1 trillion mojos)
 * - 1 mojo = 0.000000000001 XCH
 *
 * CAT tokens use whole units (no standard smallest unit like mojos)
 */

import type { AssetAmount, AssetType } from '@/entities/offer'

// Constants for Chia unit conversion
export const MOJOS_PER_XCH = 1_000_000_000_000
export const XCH_PER_MOJO = 1 / MOJOS_PER_XCH

/**
 * Convert XCH amount to mojos
 * @param xchAmount - Amount in XCH
 * @returns Amount in mojos (rounded to nearest integer)
 */
export function xchToMojos(xchAmount: AssetAmount): number {
  return Math.round(xchAmount * MOJOS_PER_XCH)
}

/**
 * Convert mojos amount to XCH
 * @param mojosAmount - Amount in mojos
 * @returns Amount in XCH
 */
export function mojosToXch(mojosAmount: number | string | bigint): AssetAmount {
  const mojos =
    typeof mojosAmount === 'string'
      ? BigInt(mojosAmount)
      : typeof mojosAmount === 'bigint'
        ? mojosAmount
        : BigInt(mojosAmount)
  return Number(mojos) * XCH_PER_MOJO
}

/**
 * Format XCH amount for display with proper precision
 * @param xchAmount - Amount in XCH
 * @param precision - Number of decimal places (default: 6)
 * @returns Formatted string
 */
export function formatXchAmount(xchAmount: AssetAmount, precision: number = 6): string {
  // Ensure amount is a number
  const numAmount = typeof xchAmount === 'string' ? parseFloat(xchAmount) : xchAmount

  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return '0'.padEnd(precision + 2, '0') // Return "0.000000" for 6 precision
  }

  return numAmount.toFixed(precision)
}

/**
 * Format mojos amount for display as XCH
 * @param mojosAmount - Amount in mojos
 * @param precision - Number of decimal places (default: 6)
 * @returns Formatted string
 */
export function formatMojosAsXch(
  mojosAmount: number | string | bigint,
  precision: number = 6
): string {
  return formatXchAmount(mojosToXch(mojosAmount), precision)
}

/**
 * Get the minimum fee in XCH
 * @returns Minimum fee in XCH
 */
export function getMinimumFeeInXch(): AssetAmount {
  return 0.000001
}

/**
 * Validate Chia address format
 * @param address - Chia address to validate
 * @returns true if valid, false otherwise
 */
export function isValidChiaAddress(address: string): boolean {
  const chiaAddressRegex = /^(xch|txch)1[a-z0-9]{58}$/
  return chiaAddressRegex.test(address.trim())
}

/**
 * Format asset amount for display based on asset type
 * @param amount - Amount to format
 * @param assetType - Type of asset ('xch', 'cat', 'nft')
 * @param precision - Number of decimal places for XCH (default: 6)
 * @returns Formatted string
 */
export function formatAssetAmount(
  amount: AssetAmount,
  assetType: AssetType,
  precision: number = 6
): string {
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return '0'
  }

  switch (assetType.toLowerCase()) {
    case 'xch':
      return formatXchAmount(numAmount, precision)
    case 'cat':
      // CAT tokens can have decimal places, show 3 decimal places for precision
      return numAmount.toFixed(3)
    case 'nft':
      // NFTs are whole numbers
      return Math.floor(numAmount).toString()
    default:
      // Default to 2 decimal places for unknown tokens
      return numAmount.toFixed(2)
  }
}

/**
 * Convert amount to smallest unit based on asset type
 * @param amount - Amount in display units
 * @param assetType - Type of asset ('xch', 'cat', 'nft')
 * @returns Amount in smallest unit
 */
export function convertToSmallestUnit(amount: AssetAmount, assetType: AssetType): number {
  switch (assetType.toLowerCase()) {
    case 'xch':
      return xchToMojos(amount)
    case 'cat':
      // CAT tokens need conversion to smallest unit (1 CAT = 1000 smallest units)
      // This ensures 1:1 mapping: user inputs 1, wallet shows 1
      return Math.round(amount * 1000)
    case 'nft':
      // NFTs are whole numbers
      return Math.floor(amount)
    default:
      // Default to exact amount for unknown tokens
      return amount
  }
}

/**
 * Convert amount from smallest unit to display unit based on asset type
 * @param amount - Amount in smallest unit
 * @param assetType - Type of asset ('xch', 'cat', 'nft')
 * @returns Amount in display units
 */
export function convertFromSmallestUnit(
  amount: number | string | bigint,
  assetType: AssetType
): AssetAmount {
  switch (assetType.toLowerCase()) {
    case 'xch':
      return mojosToXch(amount)
    case 'cat': {
      const catAmount =
        typeof amount === 'string'
          ? parseFloat(amount)
          : typeof amount === 'bigint'
            ? Number(amount)
            : amount
      return catAmount / 1000
    }
    case 'nft':
      return typeof amount === 'string'
        ? parseFloat(amount)
        : typeof amount === 'bigint'
          ? Number(amount)
          : amount
    default:
      // Default to exact amount for unknown tokens
      return typeof amount === 'string'
        ? parseFloat(amount)
        : typeof amount === 'bigint'
          ? Number(amount)
          : amount
  }
}

/**
 * Asset Input Amounts utilities
 * Handles validation and parsing of amount inputs for different asset types
 */
export const assetInputAmounts = {
  /**
   * Validate input value for amount field
   * - For XCH (native token): allows up to 12 decimal places (mojo precision)
   * - For CAT tokens: allows up to 3 decimal places
   * - For NFT: only natural numbers (1, 2, 3, etc.) - no decimals
   * - Never allows negative numbers
   * @param value - Input value to validate
   * @param assetType - Type of asset ('xch', 'cat', 'nft')
   * @returns true if valid input format
   */
  isValid(value: string, assetType?: AssetType): boolean {
    if (value === '') return true

    // Never allow negative numbers (no minus sign)
    if (value.includes('-')) return false

    // For NFT: only allow natural numbers (integers, no decimals)
    if (assetType?.toLowerCase() === 'nft') {
      return /^\d+$/.test(value) // Only digits, no decimal point
    }

    // Check for valid number format: digits, single decimal point, digits after decimal
    const decimalCount = (value.match(/\./g) || []).length
    if (!/^\d*\.?\d*$/.test(value) || decimalCount > 1) {
      return false
    }

    // Check decimal precision based on asset type
    const type = assetType?.toLowerCase()
    if (type === 'xch') {
      // XCH: up to 12 decimal places (mojo precision: 1 XCH = 1,000,000,000,000 mojos)
      const decimalPart = value.split('.')[1]
      if (decimalPart && decimalPart.length > 12) {
        return false
      }
    } else if (type === 'cat') {
      // CAT tokens: up to 3 decimal places
      const decimalPart = value.split('.')[1]
      if (decimalPart && decimalPart.length > 3) {
        return false
      }
    }
    // For other types or undefined, allow any decimal precision (backward compatibility)

    return true
  },

  /**
   * Safely parse amount input value to number
   * Handles empty string, decimal point, and invalid values
   * For NFT: ensures only natural numbers (no decimals)
   * @param value - Input value to parse
   * @param assetType - Optional asset type to enforce NFT integer constraint
   * @returns Parsed number or 0 if invalid (always a safe number)
   */
  parse(value: string, assetType?: AssetType): AssetAmount {
    if (value === '' || value === '.') {
      return 0
    }

    // For NFT: parse as integer (natural numbers only)
    if (assetType?.toLowerCase() === 'nft') {
      const parsed = parseInt(value, 10)
      // Safely convert: ensure it's a valid number, non-negative, and finite
      if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
        return 0
      }
      return Math.max(0, Math.floor(parsed)) // Ensure non-negative integer
    }

    // For tokens: parse as float
    const parsed = parseFloat(value)
    // Safely convert: ensure it's a valid number, non-negative, and finite
    if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
      return 0
    }
    return parsed
  },
}

/**
 * Format asset amount for input display (preserves user input format)
 * Only removes trailing zeros if the number is mathematically a whole number
 * @param amount - Amount to format
 * @param assetType - Type of asset ('xch', 'cat', 'nft')
 * @returns Formatted string for input display
 */
export function formatAssetAmountForInput(amount: AssetAmount, assetType: AssetType): string {
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  // Handle invalid numbers
  if (isNaN(numAmount) || numAmount === 0) {
    return ''
  }

  // Check if it's mathematically a whole number (not just an integer representation)
  // Use a small epsilon to handle floating point precision issues
  const isWholeNumber = Math.abs(numAmount - Math.round(numAmount)) < 0.0000001

  // For whole numbers, return without decimals
  if (isWholeNumber) {
    return Math.round(numAmount).toString()
  }

  // For decimal numbers, format based on asset type but remove only trailing zeros
  // This preserves significant decimal places like 1.01 and 1.0 (if user typed it)
  switch (assetType.toLowerCase()) {
    case 'xch':
      // Format with up to 12 decimal places (mojo precision), remove only trailing zeros
      // 1 XCH = 1,000,000,000,000 mojos (12 zeros)
      return numAmount.toFixed(12).replace(/\.?0+$/, '')
    case 'cat':
      // Format with up to 3 decimal places, remove only trailing zeros
      // But preserve format if user typed something like "1.0"
      return numAmount.toFixed(3).replace(/\.?0+$/, '')
    case 'nft':
      // NFTs are whole numbers
      return Math.floor(numAmount).toString()
    default:
      // Format with up to 2 decimal places, remove only trailing zeros
      return numAmount.toFixed(2).replace(/\.?0+$/, '')
  }
}

/**
 * Get placeholder text for amount input based on asset type
 * @param assetType - Type of asset ('xch', 'cat', 'nft')
 * @returns Placeholder text
 */
export function getAmountPlaceholder(assetType: AssetType): string {
  switch (assetType.toLowerCase()) {
    case 'xch':
      return '0.000000'
    case 'cat':
      return '0.000'
    case 'nft':
      return '0'
    default:
      return '0.00'
  }
}
