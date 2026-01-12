'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer, SettledLoan } from '@/entities/loan'
import { CheckCircle, Clock, Shield, TrendingUp } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMemo, useState } from 'react'
import LoanCard from './LoanCard'

interface MyCreatedLoansProps {
  loans?: LoanOffer[]
  settledLoans?: SettledLoan[]
  onViewDetails?: (loanId: number) => void
}

export default function MyCreatedLoans({
  loans = [],
  settledLoans = [],
  onViewDetails,
}: MyCreatedLoansProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'funded' | 'settled'>(
    'all'
  )
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

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

  const statusFilters = [
    { label: `All (${loans.length + settledLoans.length})`, value: 'all' as const },
    { label: `Active (${activeLoans.length})`, value: 'available' as const },
    { label: `Taken (${fundedLoans.length})`, value: 'funded' as const },
    { label: `Settled (${settledLoans.length})`, value: 'settled' as const },
  ]

  const filteredLoans =
    statusFilter === 'all'
      ? loans
      : statusFilter === 'settled'
        ? []
        : loans.filter((loan) => loan.status === statusFilter)

  return (
    <div className="space-y-2">
      {/* Statistics Cards */}
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

      {/* Filter Tabs */}
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-2 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${t.textSecondary} text-[10px] font-semibold`}>Filter:</span>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                statusFilter === filter.value
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-white/50 text-slate-800'
                  : isDark
                    ? 'bg-white/5 text-white/70 hover:bg-white/10'
                    : 'bg-white/30 text-slate-600 hover:bg-white/40'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Display */}
      {statusFilter === 'settled' && settledLoans.length > 0 && (
        <div>
          <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Settled Loans ({settledLoans.length})
          </h3>
          <div className="space-y-2">
            {settledLoans.map((loan) => (
              <div
                key={loan.id}
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
                          isDark
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-purple-100 text-purple-800'
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
                    <p
                      className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}
                    >
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
                    <p className={`${t.text} text-xs font-semibold`}>
                      ${loan.totalRepaid.toLocaleString()}
                    </p>
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
            ))}
          </div>
        </div>
      )}

      {statusFilter !== 'settled' && filteredLoans.length > 0 && (
        <div>
          {statusFilter === 'available' && activeLoans.length > 0 && (
            <div>
              <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Active Offers ({activeLoans.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {activeLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    type="created"
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {statusFilter === 'funded' && fundedLoans.length > 0 && (
            <div>
              <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Currently Taken ({fundedLoans.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {fundedLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    type="created"
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {statusFilter === 'all' && (
            <>
              {activeLoans.length > 0 && (
                <div>
                  <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active Offers ({activeLoans.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-2">
                    {activeLoans.map((loan) => (
                      <LoanCard
                        key={loan.id}
                        loan={loan}
                        type="created"
                        onViewDetails={onViewDetails}
                      />
                    ))}
                  </div>
                </div>
              )}

              {fundedLoans.length > 0 && (
                <div>
                  <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Currently Taken ({fundedLoans.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {fundedLoans.map((loan) => (
                      <LoanCard
                        key={loan.id}
                        loan={loan}
                        type="created"
                        onViewDetails={onViewDetails}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {filteredLoans.length === 0 && statusFilter !== 'settled' && (
        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-xl p-6 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          } flex items-center justify-center`}
        >
          <p className={`${t.textSecondary} text-sm`}>No loans found for this filter.</p>
        </div>
      )}
    </div>
  )
}
