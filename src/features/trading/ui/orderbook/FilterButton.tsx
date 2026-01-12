'use client'

import { Filter } from 'lucide-react'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useThemeClasses } from '@/shared/hooks'

export default function FilterButton() {
  const { t } = useThemeClasses()
  const { showFilterPane, toggleFilterPane, hasActiveFilters } = useOrderBookFilters()

  return (
    <button
      type="button"
      onClick={toggleFilterPane}
      title={showFilterPane ? 'Hide filter panel' : 'Show filter panel'}
      className={`
        relative
        flex items-center justify-center
        w-8 h-8
        rounded-lg
        transition-all duration-300
        backdrop-blur-[20px]
        border-2
        ${showFilterPane ? 'border-blue-400/60 dark:border-blue-500/60' : t.border}
        ${showFilterPane ? 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-900/40 dark:to-blue-800/30' : `${t.card} bg-opacity-80`}
        shadow-lg
        hover:scale-105
        active:scale-95
        ${showFilterPane ? 'shadow-blue-500/30 dark:shadow-blue-400/20' : 'shadow-black/10 dark:shadow-black/30'}
        group
        ${hasActiveFilters ? 'opacity-100' : 'opacity-50'}
      `}
      style={{
        boxShadow: showFilterPane
          ? '0 8px 32px -4px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
          : '0 8px 32px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
      }}
    >
      {/* Pulsing glow effect when active */}
      {showFilterPane && (
        <div
          className="absolute inset-0 rounded-lg bg-blue-400/20 dark:bg-blue-500/20 animate-pulse"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      {/* Shimmer effect on hover */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        }}
      />

      {/* Icon */}
      <Filter
        className={`
          relative z-10
          w-4 h-4
          transition-all duration-300
          ${showFilterPane ? 'text-blue-600 dark:text-blue-400' : t.text}
        `}
        style={{
          filter: showFilterPane ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      />

      {/* Badge indicator when filters are active */}
      {hasActiveFilters && !showFilterPane && (
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full border-2 border-white dark:border-gray-800" />
      )}
    </button>
  )
}
