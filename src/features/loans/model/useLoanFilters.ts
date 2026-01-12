import type { AmountFilter, FilterChip, LoanFilters, LoanOffer } from '@/entities/loan'

export function detectChipType(query: string): FilterChip {
  const q = query.toUpperCase().trim()

  // Currency detection
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

  // Collateral detection
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

  // Rate detection
  const lowerQ = query.toLowerCase()
  if (
    lowerQ.includes('low') ||
    lowerQ.includes('<') ||
    (lowerQ.includes('rate') && !lowerQ.includes('high'))
  ) {
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

  // Term/Duration detection
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

  // Default: treat as general search
  return {
    value: query,
    label: query,
    type: 'Search Query',
    description: 'Search across all loan properties',
    colorClass: 'bg-gray-600 text-white',
    category: 'search',
  }
}

export function filterLoans(
  loans: LoanOffer[],
  filters: LoanFilters,
  amountFilter: AmountFilter
): LoanOffer[] {
  const filtered = loans.filter(
    (loan) => loan.amount >= amountFilter.min && loan.amount <= amountFilter.max
  )

  if (!filters.activeChips || filters.activeChips.length === 0) {
    return filtered
  }

  return filtered.filter((loan) => {
    // Group chips by category
    const currencyChips = filters.activeChips.filter((c) => c.category === 'currency')
    const collateralChips = filters.activeChips.filter((c) => c.category === 'collateral')
    const rateChips = filters.activeChips.filter((c) => c.category === 'rate')
    const durationChips = filters.activeChips.filter((c) => c.category === 'duration')
    const searchChips = filters.activeChips.filter((c) => c.category === 'search')

    // Currency filter (OR logic within category)
    if (currencyChips.length > 0) {
      const matchesCurrency = currencyChips.some((chip) => chip.value === loan.currency)
      if (!matchesCurrency) return false
    }

    // Collateral filter (OR logic within category)
    if (collateralChips.length > 0) {
      const matchesCollateral = collateralChips.some((chip) => chip.value === loan.collateralType)
      if (!matchesCollateral) return false
    }

    // Rate filter (OR logic within category)
    if (rateChips.length > 0) {
      const matchesRate = rateChips.some((chip) => {
        if (chip.value === '< 7% APR') return loan.interestRate < 7
        if (chip.value === '7-10% APR') return loan.interestRate >= 7 && loan.interestRate <= 10
        if (chip.value === '> 10% APR') return loan.interestRate > 10
        return false
      })
      if (!matchesRate) return false
    }

    // Duration filter (OR logic within category)
    if (durationChips.length > 0) {
      const matchesDuration = durationChips.some((chip) => {
        if (chip.value === '< 6mo') return loan.duration < 6
        if (chip.value === '6-18mo') return loan.duration >= 6 && loan.duration <= 18
        if (chip.value === '> 18mo') return loan.duration > 18
        return false
      })
      if (!matchesDuration) return false
    }

    // Search filter (general text search)
    if (searchChips.length > 0) {
      const matchesSearch = searchChips.some((chip) => {
        const query = chip.value.toLowerCase()
        return (
          loan.amount.toString().includes(query) ||
          loan.currency.toLowerCase().includes(query) ||
          loan.interestRate.toString().includes(query) ||
          loan.duration.toString().includes(query) ||
          loan.collateralType.toLowerCase().includes(query) ||
          loan.maker.toLowerCase().includes(query)
        )
      })
      if (!matchesSearch) return false
    }

    return true
  })
}
