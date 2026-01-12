'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import {
  getLoanAssetDisplay,
  getCollateralDisplay,
  getRiskLabel,
  getRiskColor,
  calculateTotalInterest,
  calculateTotalRepayment,
  calculateMonthlyPayment,
  formatCurrency,
} from '../lib/loanUtils'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import { ChevronUp, Clock, Shield, DollarSign, Eye, CreditCard } from 'lucide-react'
import { useTheme } from 'next-themes'

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

  const assetTypeColors = {
    CAT: isDark
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-blue-100 text-blue-800 border-blue-300',
    NFT: isDark
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : 'bg-purple-100 text-purple-800 border-purple-300',
    Options: isDark
      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
      : 'bg-indigo-100 text-indigo-800 border-indigo-300',
  }

  const statusColors = {
    available: isDark
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-green-100 text-green-800 border-green-300',
    funded: isDark
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-blue-100 text-blue-800 border-blue-300',
    settled: isDark
      ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      : 'bg-gray-100 text-gray-800 border-gray-300',
  }

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                assetTypeColors[loan.assetType]
              }`}
            >
              {loan.assetType}
            </span>
          </div>
          <h3 className={`text-sm font-bold ${t.text} mb-0.5`}>{getLoanAssetDisplay(loan)}</h3>
          <p className={`${t.textSecondary} text-[10px]`}>
            {type === 'created'
              ? `Lent to ${loan.borrower || 'N/A'}`
              : type === 'taken'
                ? `From ${(loan as LoanAgreement).lender || loan.maker}`
                : `By ${loan.maker}`}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-medium border ${
            statusColors[loan.status]
          }`}
        >
          {loan.status === 'available'
            ? 'Available'
            : loan.status === 'funded'
              ? 'Active'
              : 'Settled'}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <ChevronUp
            className={isDark ? 'text-blue-400' : 'text-blue-600'}
            size={12}
            strokeWidth={2.5}
          />
          <div>
            <p className={`${t.textSecondary} text-[10px]`}>APR</p>
            <p className={`${t.text} text-xs font-semibold`}>{loan.interestRate}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock
            className={isDark ? 'text-purple-400' : 'text-purple-600'}
            size={12}
            strokeWidth={2.5}
          />
          <div>
            <p className={`${t.textSecondary} text-[10px]`}>Term</p>
            <p className={`${t.text} text-xs font-semibold`}>{loan.duration}mo</p>
          </div>
        </div>
      </div>

      {/* Collateral Ratio */}
      <div className={`rounded-xl p-2 mb-2 border-2 ${getRiskColor(loan.collateralRatio, isDark)}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Shield size={12} strokeWidth={2.5} />
            <span className={`${t.text} text-[10px] font-medium`}>Collateral Ratio</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isDark ? 'bg-white/10' : 'bg-white/80'
            }`}
          >
            {getRiskLabel(loan.collateralRatio)}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className={`text-xl font-bold ${t.text}`}>{loan.collateralRatio}%</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              loan.collateralAssetType === 'CAT' || loan.collateralAssetType === 'XCH'
                ? isDark
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'bg-orange-100 text-orange-800'
                : loan.collateralAssetType === 'NFT'
                  ? isDark
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-purple-100 text-purple-800'
                  : isDark
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {loan.collateralAssetType}
          </span>
        </div>
        <p className={`${t.text} text-xs font-semibold mb-1`}>{getCollateralDisplay(loan)}</p>
        {/* Progress bar */}
        <div className={`w-full ${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-full h-1`}>
          <div
            className="h-1 rounded-full transition-all"
            style={{
              width: `${Math.min(loan.collateralRatio / 3, 100)}%`,
              backgroundColor:
                loan.collateralRatio < 130
                  ? '#dc2626'
                  : loan.collateralRatio < 170
                    ? '#ca8a04'
                    : '#16a34a',
            }}
          />
        </div>
      </div>

      {/* Interest Breakdown */}
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

      {/* Action Buttons */}
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
    </div>
  )
}
