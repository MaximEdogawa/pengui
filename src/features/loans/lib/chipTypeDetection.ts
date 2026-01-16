import type { FilterChip } from '@/entities/loan'

/**
 * Detect currency chip type
 */
function detectCurrencyChip(query: string): FilterChip | null {
  const q = query.toUpperCase().trim()

  if (['B.USDC', 'B.USDT', 'USDC', 'USDT', 'XCH'].includes(q) || q.startsWith('B.')) {
    const currency = q.startsWith('B.') ? q : q === 'USDC' ? 'b.USDC' : q === 'USDT' ? 'b.USDT' : q
    return {
      value: currency,
      label: currency,
      type: 'Currency Filter',
      description: `Show only loans in ${currency}`,
      colorClass: 'bg-blue-600 text-white',
      category: 'currency',
    }
  }

  return null
}

/**
 * Detect collateral chip type
 */
function detectCollateralChip(query: string): FilterChip | null {
  const q = query.toUpperCase().trim()

  if (['XCH', 'CHIA'].includes(q)) {
    return {
      value: 'XCH',
      label: 'XCH Collateral',
      type: 'Collateral Filter',
      description: 'Show only loans with XCH as collateral',
      colorClass: 'bg-orange-600 text-white',
      category: 'collateral',
    }
  }

  return null
}

/**
 * Detect interest rate chip type
 */
function detectRateChip(query: string): FilterChip | null {
  const lowerQ = query.toLowerCase()

  if (lowerQ.includes('low') || lowerQ.includes('<') || (lowerQ.includes('rate') && !lowerQ.includes('high'))) {
    return {
      value: '< 7% APR',
      label: 'Low Rate (<7%)',
      type: 'Interest Rate Filter',
      description: 'Show loans with APR below 7%',
      colorClass: 'bg-green-600 text-white',
      category: 'rate',
    }
  }

  if (lowerQ.includes('mid') || lowerQ.includes('medium') || lowerQ.includes('average')) {
    return {
      value: '7-10% APR',
      label: 'Mid Rate (7-10%)',
      type: 'Interest Rate Filter',
      description: 'Show loans with APR between 7-10%',
      colorClass: 'bg-green-600 text-white',
      category: 'rate',
    }
  }

  if (lowerQ.includes('high') || lowerQ.includes('>')) {
    return {
      value: '> 10% APR',
      label: 'High Rate (>10%)',
      type: 'Interest Rate Filter',
      description: 'Show loans with APR above 10%',
      colorClass: 'bg-green-600 text-white',
      category: 'rate',
    }
  }

  return null
}

/**
 * Detect term/duration chip type
 */
function detectDurationChip(query: string): FilterChip | null {
  const lowerQ = query.toLowerCase()

  if (lowerQ.includes('short') || lowerQ.includes('< 6') || lowerQ.match(/\b[1-5]\s*mo/) !== null) {
    return {
      value: '< 6mo',
      label: 'Short Term (<6mo)',
      type: 'Term Length Filter',
      description: 'Show loans with term less than 6 months',
      colorClass: 'bg-purple-600 text-white',
      category: 'duration',
    }
  }

  if (lowerQ.includes('medium') || lowerQ.includes('6-18') || lowerQ.includes('year')) {
    return {
      value: '6-18mo',
      label: 'Medium Term (6-18mo)',
      type: 'Term Length Filter',
      description: 'Show loans with term between 6-18 months',
      colorClass: 'bg-purple-600 text-white',
      category: 'duration',
    }
  }

  if (lowerQ.includes('long') || lowerQ.includes('> 18') || lowerQ.includes('24')) {
    return {
      value: '> 18mo',
      label: 'Long Term (>18mo)',
      type: 'Term Length Filter',
      description: 'Show loans with term over 18 months',
      colorClass: 'bg-purple-600 text-white',
      category: 'duration',
    }
  }

  return null
}

/**
 * Create a default search chip
 */
function createSearchChip(query: string): FilterChip {
  return {
    value: query,
    label: query,
    type: 'Search Query',
    description: 'Search across all loan properties',
    colorClass: 'bg-gray-600 text-white',
    category: 'search',
  }
}

/**
 * Detect chip type from query string
 * Breaks down complex detection logic into smaller, focused functions
 */
export function detectChipType(query: string): FilterChip {
  // Try each detection function in order of specificity
  const currencyChip = detectCurrencyChip(query)
  if (currencyChip) return currencyChip

  const collateralChip = detectCollateralChip(query)
  if (collateralChip) return collateralChip

  const rateChip = detectRateChip(query)
  if (rateChip) return rateChip

  const durationChip = detectDurationChip(query)
  if (durationChip) return durationChip

  // Default: treat as general search
  return createSearchChip(query)
}
