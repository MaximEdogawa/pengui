'use client'

import { Ban, Trash2 } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferHistoryHeaderProps {
  filters: { status?: string }
  pageSize: number
  isLoading: boolean
  hasOffers: boolean
  onFilterChange: (status: string | undefined) => void
  onPageSizeChange: (pageSize: number) => void
  onCancelAll: () => void
  onDeleteAll: () => void
  isDark: boolean
  t: ThemeClasses
}

export function OfferHistoryHeader({
  filters,
  pageSize,
  isLoading,
  hasOffers,
  onFilterChange,
  onPageSizeChange,
  onCancelAll,
  onDeleteAll,
  isDark,
  t,
}: OfferHistoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
      <h2 className={`text-lg sm:text-xl font-semibold ${t.text}`}>My Offers</h2>
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange(e.target.value || undefined)}
          className={`px-3 py-1.5 rounded-lg backdrop-blur-xl font-medium text-xs transition-all duration-200 ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
          }`}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={`px-3 py-1.5 rounded-lg backdrop-blur-xl font-medium text-xs transition-all duration-200 ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
              : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
          }`}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <button
          onClick={onCancelAll}
          disabled={isLoading || !hasOffers}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:hover:bg-red-600/20'
              : 'bg-red-600/30 border border-red-600/40 text-red-700 hover:bg-red-600/40 disabled:hover:bg-red-600/30'
          }`}
          title="Cancel all active offers"
        >
          <Ban size={14} strokeWidth={2.5} />
          Cancel All
        </button>
        <button
          onClick={onDeleteAll}
          disabled={isLoading || !hasOffers}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:hover:bg-red-600/20'
              : 'bg-red-600/30 border border-red-600/40 text-red-700 hover:bg-red-600/40 disabled:hover:bg-red-600/30'
          }`}
          title="Delete all offers"
        >
          <Trash2 size={14} strokeWidth={2.5} />
          Delete All
        </button>
      </div>
    </div>
  )
}
