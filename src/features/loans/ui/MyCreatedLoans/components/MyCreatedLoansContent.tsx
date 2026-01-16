'use client'

import LoanCard from '../../LoanCard'
import { SettledLoanCard } from './SettledLoanCard'
import type { LoanOffer, SettledLoan } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface MyCreatedLoansContentProps {
  loans: LoanOffer[]
  settledLoans: SettledLoan[]
  statusFilter: 'all' | 'available' | 'funded' | 'settled'
  onViewDetails?: (loanId: number) => void
  isDark: boolean
  t: ThemeClasses
}

export function MyCreatedLoansContent({
  loans,
  settledLoans,
  statusFilter,
  onViewDetails,
  isDark,
  t,
}: MyCreatedLoansContentProps) {
  const activeLoans = loans.filter((loan) => loan.status === 'available')
  const fundedLoans = loans.filter((loan) => loan.status === 'funded')

  const filteredLoans =
    statusFilter === 'all'
      ? loans
      : statusFilter === 'settled'
        ? []
        : loans.filter((loan) => loan.status === statusFilter)

  if (statusFilter === 'settled' && settledLoans.length > 0) {
    return (
      <div>
        <h3 className={`${t.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Settled Loans ({settledLoans.length})
        </h3>
        <div className="space-y-2">
          {settledLoans.map((loan) => (
            <SettledLoanCard key={loan.id} loan={loan} isDark={isDark} t={t} />
          ))}
        </div>
      </div>
    )
  }

  if (statusFilter !== 'settled' && filteredLoans.length === 0) {
    return (
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-xl p-6 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        } flex items-center justify-center`}
      >
        <p className={`${t.textSecondary} text-sm`}>No loans found for this filter.</p>
      </div>
    )
  }

  return (
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
  )
}
