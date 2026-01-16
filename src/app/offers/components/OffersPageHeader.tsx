'use client'

import { Handshake, Plus, RefreshCw, ShoppingCart } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OffersPageHeaderProps {
  isDark: boolean
  t: ThemeClasses
  onCreateOffer: () => void
  onTakeOffer: () => void
  onRefresh: () => void
  isLoading: boolean
  isRefreshing: boolean
}

export function OffersPageHeader({
  isDark,
  t,
  onCreateOffer,
  onTakeOffer,
  onRefresh,
  isLoading,
  isRefreshing,
}: OffersPageHeaderProps) {
  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
          >
            <Handshake
              className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              size={18}
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>Offers</h1>
            <p className={`${t.textSecondary} text-xs font-medium`}>
              Create, manage, and take offers
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCreateOffer}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
              isDark
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
                : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40'
            } transition-all duration-200 font-medium text-xs`}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create Offer
          </button>
          <button
            onClick={onTakeOffer}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
            } transition-all duration-200 font-medium text-xs`}
          >
            <ShoppingCart size={14} strokeWidth={2.5} />
            Take Offer
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50'
                : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50 disabled:opacity-50'
            } transition-all duration-200 font-medium text-xs`}
          >
            <RefreshCw
              size={14}
              strokeWidth={2.5}
              className={isLoading || isRefreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
