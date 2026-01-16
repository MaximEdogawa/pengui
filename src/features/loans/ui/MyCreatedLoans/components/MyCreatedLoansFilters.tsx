'use client'

import type { LoanOffer, SettledLoan } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface FilterOption {
  label: string
  value: 'all' | 'available' | 'funded' | 'settled'
}

interface MyCreatedLoansFiltersProps {
  loans: LoanOffer[]
  settledLoans: SettledLoan[]
  statusFilter: 'all' | 'available' | 'funded' | 'settled'
  onFilterChange: (filter: 'all' | 'available' | 'funded' | 'settled') => void
  isDark: boolean
  t: ThemeClasses
}

export function MyCreatedLoansFilters({
  loans,
  settledLoans,
  statusFilter,
  onFilterChange,
  isDark,
  t,
}: MyCreatedLoansFiltersProps) {
  const activeLoans = loans.filter((loan) => loan.status === 'available')
  const fundedLoans = loans.filter((loan) => loan.status === 'funded')

  const statusFilters: FilterOption[] = [
    { label: `All (${loans.length + settledLoans.length})`, value: 'all' },
    { label: `Active (${activeLoans.length})`, value: 'available' },
    { label: `Taken (${fundedLoans.length})`, value: 'funded' },
    { label: `Settled (${settledLoans.length})`, value: 'settled' },
  ]

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-xl p-2 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`${t.textSecondary} text-[10px] font-semibold`}>Filter:</span>
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
              statusFilter === filter.value
                ? isDark
                  ? 'bg-white/10 text-white'
                  : 'bg-white/50 text-slate-800'
                : isDark
                  ? 'bg-white/5 text-white/70 hover:bg-white/10'
                  : 'bg-white/30 text-slate-600 hover:bg-white/40'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
