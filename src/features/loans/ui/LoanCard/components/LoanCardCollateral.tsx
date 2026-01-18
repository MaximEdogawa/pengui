'use client'

import { Shield } from 'lucide-react'
import { getCollateralDisplay, getRiskLabel, getRiskColor } from '../../../lib/loanUtils'
import { getCollateralAssetTypeColors } from '../../../lib/loanStatus'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanCardCollateralProps {
  loan: LoanOffer | LoanAgreement
  isDark: boolean
  t: ThemeClasses
}

export function LoanCardCollateral({ loan, isDark, t }: LoanCardCollateralProps) {
  return (
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
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getCollateralAssetTypeColors(loan.collateralAssetType, isDark)}`}
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
  )
}
