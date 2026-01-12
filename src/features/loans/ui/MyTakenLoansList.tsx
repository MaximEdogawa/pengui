'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanAgreement } from '@/entities/loan'
import LoanCard from './LoanCard'
import { useTheme } from 'next-themes'

interface MyTakenLoansListProps {
  loans: LoanAgreement[]
  onPayment: (loanId: number, paymentAmount: number) => void
  onViewDetails: (loanId: number) => void
}

export default function MyTakenLoansList({
  loans,
  onPayment,
  onViewDetails,
}: MyTakenLoansListProps) {
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
        <p className={`${t.textSecondary} text-sm`}>You don't have any active loans yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          type="taken"
          onPayment={onPayment}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
