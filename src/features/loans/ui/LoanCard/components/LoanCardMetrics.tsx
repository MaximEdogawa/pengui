'use client'

import { ChevronUp, Clock } from 'lucide-react'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanCardMetricsProps {
  loan: LoanOffer | LoanAgreement
  isDark: boolean
  t: ThemeClasses
}

export function LoanCardMetrics({ loan, isDark, t }: LoanCardMetricsProps) {
  return (
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
  )
}
