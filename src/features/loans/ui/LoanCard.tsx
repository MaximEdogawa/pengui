'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import { useTheme } from 'next-themes'
import { LoanCardHeader } from './LoanCard/components/LoanCardHeader'
import { LoanCardBody } from './LoanCard/components/LoanCardBody'
import { LoanCardActions } from './LoanCard/components/LoanCardActions'

interface LoanCardProps {
  loan: LoanOffer | LoanAgreement
  type: 'available' | 'taken' | 'created'
  onPayment?: (loanId: number, paymentAmount: number) => void
  onTakeLoan?: (loanId: number) => void
  onViewDetails?: (loanId: number) => void
}

export default function LoanCard({
  loan,
  type,
  onPayment,
  onTakeLoan,
  onViewDetails,
}: LoanCardProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <LoanCardHeader loan={loan} type={type} isDark={isDark} t={t} />
      <LoanCardBody loan={loan} type={type} isDark={isDark} t={t} />
      <LoanCardActions
        loan={loan}
        type={type}
        isDark={isDark}
        onPayment={onPayment}
        onTakeLoan={onTakeLoan}
        onViewDetails={onViewDetails}
      />
    </div>
  )
}
