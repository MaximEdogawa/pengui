'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer } from '@/entities/loan'
import { useTheme } from 'next-themes'
import LoanCard from './LoanCard'

interface AvailableLoansListProps {
  loans: LoanOffer[]
  onTakeLoan: (loanId: number) => void
  onViewDetails: (loanId: number) => void
}

export default function AvailableLoansList({
  loans,
  onTakeLoan,
  onViewDetails,
}: AvailableLoansListProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  if (loans.length === 0) {
    return (
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-6 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        } flex items-center justify-center`}
      >
        <p className={`${t.textSecondary} text-sm`}>No loans match your filters.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2">
        <p className={`${t.textSecondary} text-xs`}>{loans.length} loans available</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            type="available"
            onTakeLoan={onTakeLoan}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  )
}
