'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer, SettledLoan } from '@/entities/loan'
import { DollarSign, TrendingUp, Percent, Briefcase } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

interface LoanIncomeAnalyticsProps {
  loans?: LoanOffer[]
  settledLoans?: SettledLoan[]
}

export default function LoanIncomeAnalytics({
  loans = [],
  settledLoans = [],
}: LoanIncomeAnalyticsProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  const totalIncome = useMemo(() => {
    return settledLoans.reduce((sum, loan) => sum + loan.totalInterest, 0)
  }, [settledLoans])

  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'funded'), [loans])

  const averageInterestRate = useMemo(() => {
    if (loans.length === 0) return 0
    const sum = loans.reduce((acc, loan) => acc + loan.interestRate, 0)
    return sum / loans.length
  }, [loans])

  const totalLent = useMemo(() => {
    return loans
      .filter((loan) => loan.status === 'funded')
      .reduce((sum, loan) => sum + loan.amount, 0)
  }, [loans])

  const projectedMonthlyIncome = useMemo(() => {
    return activeLoans.reduce((sum, loan) => {
      const monthlyRate = loan.interestRate / 100 / 12
      return sum + loan.amount * monthlyRate
    }, 0)
  }, [activeLoans])

  return (
    <div className="space-y-2">
      <div className="mb-2">
        <h2 className={`${t.text} text-lg font-semibold mb-1`}>Income Analytics</h2>
        <p className={`${t.textSecondary} text-xs`}>Overview of your lending income</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`${t.textSecondary} text-[10px] font-medium`}>Total Income</span>
            <DollarSign
              className={isDark ? 'text-green-400' : 'text-green-600'}
              size={14}
              strokeWidth={2}
            />
          </div>
          <div className={`${t.text} text-xl font-bold mb-0.5`}>
            ${totalIncome.toLocaleString()}
          </div>
          <div className={`${t.textSecondary} text-[10px]`}>
            From {settledLoans.length} settled loans
          </div>
        </div>

        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`${t.textSecondary} text-[10px] font-medium`}>Active Loans</span>
            <Briefcase
              className={isDark ? 'text-blue-400' : 'text-blue-600'}
              size={14}
              strokeWidth={2}
            />
          </div>
          <div className={`${t.text} text-xl font-bold mb-0.5`}>{activeLoans.length}</div>
          <div className={`${t.textSecondary} text-[10px]`}>
            ${totalLent.toLocaleString()} currently lent
          </div>
        </div>

        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`${t.textSecondary} text-[10px] font-medium`}>Avg. Interest Rate</span>
            <Percent
              className={isDark ? 'text-purple-400' : 'text-purple-600'}
              size={14}
              strokeWidth={2}
            />
          </div>
          <div className={`${t.text} text-xl font-bold mb-0.5`}>
            {averageInterestRate.toFixed(1)}%
          </div>
          <div className={`${t.textSecondary} text-[10px]`}>Across all loans</div>
        </div>

        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`${t.textSecondary} text-[10px] font-medium`}>Projected Monthly</span>
            <TrendingUp
              className={isDark ? 'text-cyan-400' : 'text-cyan-600'}
              size={14}
              strokeWidth={2}
            />
          </div>
          <div className={`${t.text} text-xl font-bold mb-0.5`}>
            ${projectedMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className={`${t.textSecondary} text-[10px]`}>Based on active loans</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <h3 className={`${t.text} text-sm font-semibold mb-2`}>Performance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Total Loans Created</p>
            <p className={`${t.text} text-sm font-bold`}>{loans.length}</p>
          </div>
          <div>
            <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Settled Loans</p>
            <p className={`${t.text} text-sm font-bold`}>{settledLoans.length}</p>
          </div>
          <div>
            <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Total Value Locked</p>
            <p className={`${t.text} text-sm font-bold`}>
              $
              {(
                totalLent + settledLoans.reduce((sum, loan) => sum + loan.amount, 0)
              ).toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`${t.textSecondary} text-[10px] mb-0.5`}>Avg. Loan Amount</p>
            <p className={`${t.text} text-sm font-bold`}>
              $
              {loans.length > 0
                ? (totalLent / loans.length).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : '0'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
