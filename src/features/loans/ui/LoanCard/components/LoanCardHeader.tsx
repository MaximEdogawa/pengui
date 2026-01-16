'use client'

import { getLoanAssetDisplay } from '../../../lib/loanUtils'
import { getLoanStatusText, getLoanStatusColors, getAssetTypeColors } from '../../../lib/loanStatus'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanCardHeaderProps {
  loan: LoanOffer | LoanAgreement
  type: 'available' | 'taken' | 'created'
  isDark: boolean
  t: ThemeClasses
}

export function LoanCardHeader({ loan, type, isDark, t }: LoanCardHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getAssetTypeColors(loan.assetType, isDark)}`}
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
        className={`px-2 py-1 rounded-full text-[10px] font-medium border ${getLoanStatusColors(loan.status, isDark)}`}
      >
        {getLoanStatusText(loan.status)}
      </span>
    </div>
  )
}
