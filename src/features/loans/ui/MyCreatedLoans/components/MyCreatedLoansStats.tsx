'use client'

import { CheckCircle, Clock, Shield, TrendingUp } from 'lucide-react'
import type { LoanOffer, SettledLoan } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'
import { useMemo } from 'react'

interface MyCreatedLoansStatsProps {
  loans: LoanOffer[]
  settledLoans: SettledLoan[]
  isDark: boolean
  t: ThemeClasses
}

export function MyCreatedLoansStats({ loans, settledLoans, isDark, t }: MyCreatedLoansStatsProps) {
  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'available'), [loans])
  const fundedLoans = useMemo(() => loans.filter((loan) => loan.status === 'funded'), [loans])

  const totalValueLocked = useMemo(() => {
    const funded = fundedLoans.reduce((sum, loan) => sum + loan.amount, 0)
    const settled = settledLoans.reduce((sum, loan) => sum + loan.amount, 0)
    return funded + settled
  }, [fundedLoans, settledLoans])

  const currentlyLent = useMemo(
    () => fundedLoans.reduce((sum, loan) => sum + loan.amount, 0),
    [fundedLoans]
  )

  const totalInterestEarned = useMemo(
    () => settledLoans.reduce((sum, loan) => sum + loan.totalInterest, 0),
    [settledLoans]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20'
            : 'bg-gradient-to-br from-blue-500/30 to-blue-600/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${t.textSecondary} text-[10px] font-medium`}>Total Value Locked</span>
          <Shield
            className={isDark ? 'text-blue-300' : 'text-blue-700'}
            size={14}
            strokeWidth={2}
          />
        </div>
        <div className={`${t.text} text-xl font-bold mb-0.5`}>
          ${totalValueLocked.toLocaleString()}
        </div>
        <div className={`${t.textSecondary} text-[10px]`}>
          ${currentlyLent.toLocaleString()} currently lent
        </div>
      </div>

      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${t.textSecondary} text-[10px] font-medium`}>Active Offers</span>
          <Clock
            className={isDark ? 'text-green-400' : 'text-green-600'}
            size={14}
            strokeWidth={2}
          />
        </div>
        <div className={`${t.text} text-xl font-bold mb-0.5`}>{activeLoans.length}</div>
        <div className={`${t.textSecondary} text-[10px]`}>
          ${activeLoans.reduce((sum, loan) => sum + loan.amount, 0).toLocaleString()} available
        </div>
      </div>

      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${t.textSecondary} text-[10px] font-medium`}>Currently Taken</span>
          <TrendingUp
            className={isDark ? 'text-blue-400' : 'text-blue-600'}
            size={14}
            strokeWidth={2}
          />
        </div>
        <div className={`${t.text} text-xl font-bold mb-0.5`}>{fundedLoans.length}</div>
        <div className={`${t.textSecondary} text-[10px]`}>
          ${currentlyLent.toLocaleString()} lent out
        </div>
      </div>

      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${t.textSecondary} text-[10px] font-medium`}>Settled Loans</span>
          <CheckCircle
            className={isDark ? 'text-purple-400' : 'text-purple-600'}
            size={14}
            strokeWidth={2}
          />
        </div>
        <div className={`${t.text} text-xl font-bold mb-0.5`}>{settledLoans.length}</div>
        <div className={`${t.textSecondary} text-[10px]`}>
          +${totalInterestEarned.toLocaleString()} earned
        </div>
      </div>
    </div>
  )
}
