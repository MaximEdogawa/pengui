'use client'

import { TrendingUp } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface BalanceCardProps {
  isDark: boolean
  t: ThemeClasses
}

export function BalanceCard({ isDark, t }: BalanceCardProps) {
  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p
            className={`${t.textSecondary} text-[10px] font-medium mb-2 uppercase tracking-wide`}
          >
            Total Balance
          </p>
          <h2 className={`text-2xl lg:text-3xl font-semibold ${t.text} tracking-tight`}>
            $47,892.50
          </h2>
        </div>
        <div
          className={`backdrop-blur-xl ${isDark ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-emerald-500/15 border-emerald-600/20'} px-3 py-1.5 rounded-full border transition-all duration-300`}
        >
          <div
            className={`flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
          >
            <TrendingUp size={14} strokeWidth={2.5} />
            <span className="font-semibold text-xs">+12.5%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
