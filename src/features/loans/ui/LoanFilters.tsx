'use client'

import { detectChipType } from '../model/useLoanFilters'
import { getThemeClasses } from '@/shared/lib/theme'
import type { AmountFilter, LoanFilters } from '@/entities/loan'
import { Search, X } from 'lucide-react'
import { useTheme } from 'next-themes'

interface LoanFiltersProps {
  filters: LoanFilters
  amountFilter: AmountFilter
  onFiltersChange: (filters: LoanFilters) => void
  onAmountFilterChange: (filter: AmountFilter) => void
}

const quickFilters = [
  { query: 'b.USDC', label: 'b.USDC' },
  { query: 'b.USDT', label: 'b.USDT' },
  { query: 'XCH', label: 'XCH Collateral' },
  { query: 'low rate', label: 'Low Rate' },
  { query: 'short term', label: 'Short Term' },
]

export default function LoanFilters({
  filters,
  amountFilter,
  onFiltersChange,
  onAmountFilterChange,
}: LoanFiltersProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  const addFilterChip = () => {
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.trim()
      const chipInfo = detectChipType(query)
      if (chipInfo && !filters.activeChips.some((c) => c.value === chipInfo.value)) {
        onFiltersChange({
          ...filters,
          activeChips: [...filters.activeChips, chipInfo],
          searchQuery: '',
        })
      }
    }
  }

  const addQuickFilter = (query: string) => {
    const chipInfo = detectChipType(query)
    if (chipInfo && !filters.activeChips.some((c) => c.value === chipInfo.value)) {
      onFiltersChange({
        ...filters,
        activeChips: [...filters.activeChips, chipInfo],
      })
    }
  }

  const removeFilterChip = (index: number) => {
    onFiltersChange({
      ...filters,
      activeChips: filters.activeChips.filter((_, i) => i !== index),
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      activeChips: [],
    })
  }

  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-xl p-2 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      {/* Search Bar */}
      <div className="mb-2">
        <div className="relative">
          <Search
            className={`absolute left-2 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
            size={14}
            strokeWidth={2}
          />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addFilterChip()
              }
            }}
            placeholder="Search by currency, collateral, rate, or term... (press Enter)"
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
                : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
            } backdrop-blur-xl focus:outline-none focus:ring-2 ${
              isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
            }`}
          />
        </div>
      </div>

      {/* Amount Filter */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`${t.textSecondary} text-[10px] whitespace-nowrap`}>Amount:</span>
        <input
          type="range"
          min="0"
          max="100000"
          step="1000"
          value={amountFilter.max}
          onChange={(e) => onAmountFilterChange({ min: 0, max: Number(e.target.value) })}
          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
        />
        <span className={`${t.text} text-[10px] font-medium min-w-[50px] text-right`}>
          {amountFilter.max === 100000 ? '100k+' : `${(amountFilter.max / 1000).toFixed(0)}k`}
        </span>
        <button
          onClick={() => onAmountFilterChange({ min: 0, max: 100000 })}
          className={`text-[10px] ${t.textSecondary} hover:${t.text} transition-colors`}
        >
          Reset
        </button>
      </div>

      {/* Active Filter Chips */}
      {filters.activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
          {filters.activeChips.map((chip, index) => (
            <div key={index} className="relative group">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-help transition-all ${chip.colorClass}`}
              >
                {chip.label}
                <button
                  onClick={() => removeFilterChip(index)}
                  className="hover:opacity-100 opacity-70 ml-0.5"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            </div>
          ))}
          <button
            onClick={clearAllFilters}
            className={`text-[10px] ${t.textSecondary} hover:${t.text} transition-colors`}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Quick Filter Suggestions */}
      {filters.activeChips.length === 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${t.textSecondary} text-[10px]`}>Quick filters:</span>
            {quickFilters.map((suggestion) => (
              <button
                key={suggestion.query}
                onClick={() => addQuickFilter(suggestion.query)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
                }`}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
