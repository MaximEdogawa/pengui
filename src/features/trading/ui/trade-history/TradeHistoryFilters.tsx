'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useTradeHistoryFilters } from '../../model/useTradeHistoryFilters'
import { X, Calendar, Filter } from 'lucide-react'

export default function TradeHistoryFilters() {
  const { t } = useThemeClasses()
  const {
    filters,
    hasActiveFilters,
    setDateRangePreset,
    setTradeType,
    setMyTradesOnly,
    clearFilters,
  } = useTradeHistoryFilters()

  return (
    <div className={`p-3 border-b ${t.border} ${t.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Presets */}
        <div className="flex items-center gap-1">
          <Calendar className={`w-4 h-4 ${t.textSecondary}`} />
          <button
            onClick={() => setDateRangePreset('today')}
            className={`px-2 py-1 text-xs rounded ${
              filters.dateRange.preset === 'today'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRangePreset('7days')}
            className={`px-2 py-1 text-xs rounded ${
              filters.dateRange.preset === '7days'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRangePreset('30days')}
            className={`px-2 py-1 text-xs rounded ${
              filters.dateRange.preset === '30days'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            30 Days
          </button>
        </div>

        {/* Trade Type Filter */}
        <div className="flex items-center gap-1">
          <Filter className={`w-4 h-4 ${t.textSecondary}`} />
          <button
            onClick={() => setTradeType('all')}
            className={`px-2 py-1 text-xs rounded ${
              filters.tradeType === 'all'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTradeType('buy')}
            className={`px-2 py-1 text-xs rounded ${
              filters.tradeType === 'buy'
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`px-2 py-1 text-xs rounded ${
              filters.tradeType === 'sell'
                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                : `${t.cardHover} ${t.textSecondary}`
            }`}
          >
            Sell
          </button>
        </div>

        {/* My Trades Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.myTradesOnly}
              onChange={(e) => setMyTradesOnly(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className={`text-xs ${t.text}`}>My Trades Only</span>
          </label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={`ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded ${t.cardHover} ${t.textSecondary}`}
          >
            <X className="w-3 h-3" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}
