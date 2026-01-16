'use client'

import { DollarSign } from 'lucide-react'
import { formatCurrency, calculateTotalInterest, calculateTotalRepayment, calculateMonthlyPayment } from '../../../lib/loanUtils'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanCardInterestProps {
  loan: LoanOffer | LoanAgreement
  isDark: boolean
  t: ThemeClasses
}

export function LoanCardInterest({ loan, isDark, t }: LoanCardInterestProps) {
  const isAgreement = 'monthlyPayment' in loan
  const totalInterest = isAgreement
    ? (loan as LoanAgreement).totalRepayment - loan.amount
    : calculateTotalInterest(loan.amount, loan.interestRate, loan.duration)
  const totalRepayment = isAgreement
    ? (loan as LoanAgreement).totalRepayment
    : calculateTotalRepayment(loan.amount, loan.interestRate, loan.duration)
  const monthlyPayment = isAgreement
    ? (loan as LoanAgreement).monthlyPayment
    : calculateMonthlyPayment(loan.amount, loan.interestRate, loan.duration)

  return (
    <div
      className={`rounded-xl p-2 mb-2 border ${
        isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <DollarSign
          className={isDark ? 'text-blue-400' : 'text-blue-600'}
          size={12}
          strokeWidth={2.5}
        />
        <span className={`${t.text} text-[10px] font-semibold`}>Interest Breakdown</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className={`${t.textSecondary} text-[10px]`}>Principal:</span>
          <span className={`${t.text} text-xs font-bold`}>
            {formatCurrency(loan.amount, loan.currency)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`${t.textSecondary} text-[10px]`}>Total Interest:</span>
          <span className={`${t.text} text-xs font-bold`}>
            {formatCurrency(totalInterest, loan.currency)}
          </span>
        </div>
        <div
          className={`border-t ${isDark ? 'border-blue-500/20' : 'border-blue-200'} pt-1 mt-1`}
        >
          <div className="flex justify-between items-center">
            <span className={`${t.textSecondary} text-[10px]`}>Total Repayment:</span>
            <span className={`${t.text} text-sm font-bold`}>
              {formatCurrency(totalRepayment, loan.currency)}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className={`${t.textSecondary} text-[10px]`}>Monthly Payment:</span>
          <span className={`${t.text} text-xs font-semibold`}>
            {formatCurrency(monthlyPayment, loan.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}
