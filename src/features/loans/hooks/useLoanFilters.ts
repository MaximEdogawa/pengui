import type { AmountFilter, LoanFilters, LoanOffer } from '@/entities/loan'
import { detectChipType } from '../lib/chipTypeDetection'

export { detectChipType }

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
