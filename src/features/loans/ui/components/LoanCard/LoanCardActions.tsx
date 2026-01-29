'use client'

import { CreditCard, DollarSign, Eye } from 'lucide-react'
import { calculateMonthlyPayment } from '../../../lib/loanUtils'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'

interface LoanCardActionsProps {
  loan: LoanOffer | LoanAgreement
  type: 'available' | 'taken' | 'created'
  isDark: boolean
  onPayment?: (loanId: number, paymentAmount: number) => void
  onTakeLoan?: (loanId: number) => void
  onViewDetails?: (loanId: number) => void
}

export function LoanCardActions({
  loan,
  type,
  isDark,
  onPayment,
  onTakeLoan,
  onViewDetails,
}: LoanCardActionsProps) {
  const isAgreement = 'monthlyPayment' in loan
  const monthlyPayment = isAgreement
    ? (loan as LoanAgreement).monthlyPayment
    : calculateMonthlyPayment(loan.amount, loan.interestRate, loan.duration)

  return (
    <div className="flex gap-1.5 mt-2">
      {type === 'available' && onTakeLoan && (
        <button
          onClick={() => onTakeLoan(loan.id)}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-[11px] ${
            isDark
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
              : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40'
          }`}
        >
          <CreditCard size={12} strokeWidth={2.5} />
          Take Loan
        </button>
      )}
      {type === 'taken' &&
        onPayment &&
        isAgreement &&
        (loan as LoanAgreement).paymentsRemaining > 0 && (
          <button
            onClick={() => onPayment(loan.id, monthlyPayment)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-[11px] ${
              isDark
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30'
                : 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-600/40 text-green-700 hover:from-green-600/40 hover:to-emerald-600/40'
            }`}
          >
            <DollarSign size={12} strokeWidth={2.5} />
            Make Payment
          </button>
        )}
      {onViewDetails && (
        <button
          onClick={() => onViewDetails(loan.id)}
          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-[11px] ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
          }`}
        >
          <Eye size={12} strokeWidth={2.5} />
          Details
        </button>
      )}
    </div>
  )
}
