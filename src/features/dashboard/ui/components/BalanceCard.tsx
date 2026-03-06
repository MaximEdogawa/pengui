'use client'

import Link from 'next/link'
import { TrendingUp, ArrowRight, Wallet } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { useWalletAssets } from '@/features/wallet'

interface BalanceCardProps {
  isDark: boolean
  t: ThemeClasses
}

export function BalanceCard({ isDark, t }: BalanceCardProps) {
  const { assets, isLoading } = useWalletAssets()
  const totalUsd =
    assets.reduce((sum, a) => sum + (a.balanceUsd ?? 0), 0) || null
  const displayValue =
    totalUsd != null && totalUsd > 0
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(totalUsd)
      : null

  const assetCount = assets.length

  return (
    <Link
      href="/wallet"
      className={`block backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white/30 hover:bg-white/40'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`p-2 rounded-xl backdrop-blur-sm ${
                isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/15'
              }`}
            >
              <Wallet
                className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
                size={16}
                strokeWidth={2}
              />
            </div>
            <p
              className={`${t.textSecondary} text-[10px] font-medium uppercase tracking-wide`}
            >
              Total Balance
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <div className={`h-7 w-36 rounded-lg ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/60'} animate-pulse`} />
              <div className={`h-3 w-20 rounded-md ${isDark ? 'bg-white/[0.04]' : 'bg-slate-200/40'} animate-pulse`} />
            </div>
          ) : (
            <>
              <h2 className={`text-2xl lg:text-3xl font-semibold ${t.text} tracking-tight`}>
                {displayValue ?? '$0.00'}
              </h2>
              <p className={`${t.textTertiary} text-[10px] font-medium mt-1`}>
                {assetCount} asset{assetCount !== 1 ? 's' : ''} in wallet
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={`backdrop-blur-xl ${isDark ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-emerald-500/15 border-emerald-600/20'} px-3 py-1.5 rounded-full border transition-all duration-300`}
          >
            <div
              className={`flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
            >
              <TrendingUp size={14} strokeWidth={2.5} />
              <span className="font-semibold text-xs">Wallet</span>
            </div>
          </div>
          <span className={`flex items-center gap-1 text-[10px] font-medium ${t.textTertiary}`}>
            View details <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </Link>
  )
}
