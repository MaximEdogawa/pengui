'use client'

import type { SettledLoan } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface SettledLoanCardProps {
  loan: SettledLoan
  isDark: boolean
  t: ThemeClasses
}

export function SettledLoanCard({ loan, isDark, t }: SettledLoanCardProps) {
  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`${t.text} text-sm font-bold`}>
              {loan.amount.toLocaleString()} {loan.currency}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'
              }`}
            >
              Settled
            </span>
          </div>
          <p className={`${t.textSecondary} text-[10px]`}>
            Borrower: <span className="font-mono">{loan.borrower}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            +${loan.totalInterest.toLocaleString()}
          </p>
          <p className={`${t.textSecondary} text-[10px]`}>Interest earned</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-white/10">
        <div>
          <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Term</p>
          <p className={`${t.text} text-xs font-semibold`}>{loan.duration} months</p>
        </div>
        <div>
          <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Collateral</p>
          <p className={`${t.text} text-xs font-semibold`}>
            {loan.collateralRatio}% {loan.collateralType}
          </p>
        </div>
        <div>
          <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Total Repaid</p>
          <p className={`${t.text} text-xs font-semibold`}>${loan.totalRepaid.toLocaleString()}</p>
        </div>
        <div>
          <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Started</p>
          <p className={`${t.text} text-xs font-semibold`}>{loan.startDate}</p>
        </div>
        <div>
          <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Settled</p>
          <p className={`${t.text} text-xs font-semibold`}>{loan.endDate}</p>
        </div>
      </div>
    </div>
  )
}
