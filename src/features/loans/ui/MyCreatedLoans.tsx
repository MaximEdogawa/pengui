'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer, SettledLoan } from '@/entities/loan'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { MyCreatedLoansStats } from './MyCreatedLoans/components/MyCreatedLoansStats'
import { MyCreatedLoansFilters } from './MyCreatedLoans/components/MyCreatedLoansFilters'
import { MyCreatedLoansContent } from './MyCreatedLoans/components/MyCreatedLoansContent'

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

  return (
    <div className="space-y-2">
      <MyCreatedLoansStats loans={loans} settledLoans={settledLoans} isDark={isDark} t={t} />
      <MyCreatedLoansFilters
        loans={loans}
        settledLoans={settledLoans}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        isDark={isDark}
        t={t}
      />
      <MyCreatedLoansContent
        loans={loans}
        settledLoans={settledLoans}
        statusFilter={statusFilter}
        onViewDetails={onViewDetails}
        isDark={isDark}
        t={t}
      />
    </div>
  )
}
