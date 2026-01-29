'use client'

import { formatCurrency } from '../../../lib/loanUtils'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'
import { LoanCardMetrics } from './LoanCardMetrics'
import { LoanCardCollateral } from './LoanCardCollateral'
import { LoanCardInterest } from './LoanCardInterest'

interface LoanCardBodyProps {
  loan: LoanOffer | LoanAgreement
  type: 'available' | 'taken' | 'created'
  isDark: boolean
  t: ThemeClasses
}

export function LoanCardBody({ loan, type, isDark, t }: LoanCardBodyProps) {
  const isAgreement = 'monthlyPayment' in loan

  return (
    <>
      <LoanCardMetrics loan={loan} isDark={isDark} t={t} />
      <LoanCardCollateral loan={loan} isDark={isDark} t={t} />
      <LoanCardInterest loan={loan} isDark={isDark} t={t} />

      {/* Option Contract Details */}
      {loan.optionType && loan.strikePrice && (
        <div
          className={`rounded-xl p-2 mb-2 border ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
          }`}
        >
          <p className={`${t.text} text-[10px] font-semibold mb-1`}>Option Contract</p>
          <p className={`${t.textSecondary} text-[10px]`}>
            {loan.optionType} @ {formatCurrency(loan.strikePrice, loan.currency)}
          </p>
        </div>
      )}

      {/* Payment Info for Taken Loans */}
      {type === 'taken' && isAgreement && (
        <div
          className={`rounded-xl p-2 mb-2 border ${
            isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
          }`}
        >
          <p className={`${t.text} text-[10px] font-semibold mb-1`}>Payment Info</p>
          <p className={`${t.textSecondary} text-[10px]`}>
            Next: {(loan as LoanAgreement).nextPayment} ({' '}
            {(loan as LoanAgreement).paymentsRemaining} remaining)
          </p>
        </div>
      )}
    </>
  )
}
