/**
 * Format amount utilities for order book
 * Compact formatting that only truncates when necessary
 */

/**
 * Add thousand separators (commas) to integer part
 */
function addThousandSeparators(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format amount for display - preserves full precision, only truncates if decimals are excessive (>12)
 * CSS truncate class handles responsive visual truncation based on available space
 */
export function formatAmountForDisplay(amount: number): string {
  if (amount === 0) return '0'
  if (amount < 0.000001) return amount.toExponential(2)

  const str = amount.toString()
  const [int, dec] = str.split('.')

  // Only programmatically truncate if decimals are excessive (>12)
  // Otherwise show full value - CSS will handle responsive truncation
  if (dec && dec.length > 12) {
    // Only truncate if decimals exceed 12 places
    const truncated = dec.slice(0, 12)
    // Remove trailing zeros from truncated part
    const trimmedTruncated = truncated.replace(/0+$/, '')
    const formattedInt = addThousandSeparators(int)
    return trimmedTruncated ? `${formattedInt}.${trimmedTruncated}…` : `${formattedInt}…`
  }

  // Show full value without truncation - preserve original precision
  // Remove trailing zeros for cleaner display, but keep all significant digits
  const formattedInt = addThousandSeparators(int)
  if (!dec) {
    return formattedInt
  }

  // Remove trailing zeros but keep all significant decimal places
  const trimmedDecimal = dec.replace(/0+$/, '')
  return trimmedDecimal ? `${formattedInt}.${trimmedDecimal}` : formattedInt
}

/**
 * Format price for display - cuts decimals without rounding or truncation indicator
 * For prices < 1: 7 decimals
 * For prices >= 1: 2 decimals
 */
export function formatPriceForDisplay(price: number): string {
  if (price === 0) return '0'
  if (price < 0.000001) return price.toExponential(2)

  const str = price.toString()
  const [int, dec] = str.split('.')
  const formattedInt = addThousandSeparators(int)

  if (price < 1) {
    // For prices < 1: cut to 7 decimals (no rounding, no truncation indicator)
    if (!dec) return formattedInt
    const cutDecimals = dec.slice(0, 7)
    // Remove trailing zeros for cleaner display
    const trimmedDecimals = cutDecimals.replace(/0+$/, '')
    return trimmedDecimals ? `${formattedInt}.${trimmedDecimals}` : formattedInt
  } else {
    // For prices >= 1: cut to 2 decimals (no rounding, no truncation indicator)
    if (!dec) return formattedInt
    const cutDecimals = dec.slice(0, 2)
    // Remove trailing zeros for cleaner display
    const trimmedDecimals = cutDecimals.replace(/0+$/, '')
    return trimmedDecimals ? `${formattedInt}.${trimmedDecimals}` : formattedInt
  }
}

/**
 * Format amount for tooltip (full precision)
 */
export function formatAmountForTooltip(amount: number): string {
  if (amount === 0) return '0'
  if (amount < 0.000001) return amount.toExponential(8)
  // Show full precision up to 18 decimal places (typical for blockchain amounts)
  const amountStr = amount.toString()
  const [integerPart, decimalPart] = amountStr.split('.')
  const formattedInt = addThousandSeparators(integerPart)

  if (!decimalPart) {
    return formattedInt
  }

  // Remove trailing zeros but keep significant digits
  const trimmedDecimal = decimalPart.replace(/0+$/, '')
  return trimmedDecimal ? `${formattedInt}.${trimmedDecimal}` : formattedInt
}
