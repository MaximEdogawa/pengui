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
 * When maxDecimals is set (e.g. 4 for mobile), caps decimal places to that.
 */
export function formatAmountForDisplay(amount: number, maxDecimals?: number): string {
  const n = amount == null || typeof amount !== 'number' || Number.isNaN(amount) ? 0 : Number(amount)
  if (n === 0) return '0'
  if (n < 0.000001) return n.toExponential(2)

  const str = n.toString()
  const [int, dec] = str.split('.')
  const cap = maxDecimals ?? 12

  // Truncate decimals to cap (e.g. 4 on mobile, 12 by default)
  if (dec && dec.length > cap) {
    const truncated = dec.slice(0, cap)
    const trimmedTruncated = truncated.replace(/0+$/, '')
    const formattedInt = addThousandSeparators(int)
    return trimmedTruncated ? `${formattedInt}.${trimmedTruncated}` : formattedInt
  }

  // Show full value up to cap
  const formattedInt = addThousandSeparators(int)
  if (!dec) {
    return formattedInt
  }

  const trimmedDecimal = dec.replace(/0+$/, '')
  return trimmedDecimal ? `${formattedInt}.${trimmedDecimal}` : formattedInt
}

/**
 * Format price for display - cuts decimals without rounding or truncation indicator
 * When maxDecimals is set (e.g. 4 for mobile), caps to that. Otherwise:
 * For prices < 1: 7 decimals. For prices >= 1: 2 decimals.
 */
export function formatPriceForDisplay(price: number, maxDecimals?: number): string {
  const p = price == null || typeof price !== 'number' || Number.isNaN(price) ? 0 : Number(price)
  if (p === 0) return '0'
  if (p < 0.000001) return p.toExponential(2)

  const str = p.toString()
  const [int, dec] = str.split('.')
  const formattedInt = addThousandSeparators(int)

  if (maxDecimals != null) {
    if (!dec) return formattedInt
    const cutDecimals = dec.slice(0, maxDecimals)
    const trimmedDecimals = cutDecimals.replace(/0+$/, '')
    return trimmedDecimals ? `${formattedInt}.${trimmedDecimals}` : formattedInt
  }

  if (p < 1) {
    if (!dec) return formattedInt
    const cutDecimals = dec.slice(0, 7)
    const trimmedDecimals = cutDecimals.replace(/0+$/, '')
    return trimmedDecimals ? `${formattedInt}.${trimmedDecimals}` : formattedInt
  } else {
    if (!dec) return formattedInt
    const cutDecimals = dec.slice(0, 2)
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
