'use client'

import { useThemeClasses } from '@/shared/hooks'
import { X } from 'lucide-react'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'

interface FilterPanelProps {
  onFiltersChange?: () => void
}

export default function FilterPanel({ onFiltersChange }: FilterPanelProps) {
  const { t } = useThemeClasses()
  const { filters, hasActiveFilters, clearAllFilters, showFilterPane, setShowFilterPane } =
    useOrderBookFilters()

  const handleClearAll = () => {
    clearAllFilters()
    // Trigger callback after state update
    setTimeout(() => {
      onFiltersChange?.()
    }, 0)
  }

  if (!showFilterPane) {
    return null
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] backdrop-blur-[40px] ${t.card} border-2 ${t.border} rounded-lg shadow-2xl p-4 max-w-2xl w-full mx-4`}
      style={{
        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${t.text}`}>Active Filters</h3>
        <button
          type="button"
          onClick={() => setShowFilterPane(false)}
          className={`${t.textSecondary} hover:${t.text} transition-colors`}
        >
          <X size={16} />
        </button>
      </div>

      {hasActiveFilters ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Buy Asset Filters */}
            {filters.buyAsset?.map((asset) => (
              <div
                key={`buy-${asset}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${t.card} border ${t.border} text-xs`}
              >
                <span className={t.text}>Buy: {asset}</span>
              </div>
            ))}

            {/* Sell Asset Filters */}
            {filters.sellAsset?.map((asset) => (
              <div
                key={`sell-${asset}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${t.card} border ${t.border} text-xs`}
              >
                <span className={t.text}>Sell: {asset}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className={`text-xs ${t.textSecondary} hover:${t.text} transition-colors underline`}
          >
            Clear all filters
          </button>
        </>
      ) : (
        <div className={`text-sm ${t.textSecondary} py-2`}>
          No active filters. Use the search bar above to add filters.
        </div>
      )}
    </div>
  )
}
