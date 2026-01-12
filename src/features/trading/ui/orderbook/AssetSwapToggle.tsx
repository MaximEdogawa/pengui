'use client'

import { ArrowUpDown } from 'lucide-react'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useThemeClasses } from '@/shared/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

export default function AssetSwapToggle() {
  const { t } = useThemeClasses()
  const { filters, assetsSwapped, swapBuySellAssets } = useOrderBookFilters()
  const queryClient = useQueryClient()

  // Check if both filters are present to enable/disable the button
  // Enabled when both buy and sell asset filters have at least one asset
  const hasBothFilters = useMemo(() => {
    return (
      filters.buyAsset &&
      filters.buyAsset.length > 0 &&
      filters.sellAsset &&
      filters.sellAsset.length > 0
    )
  }, [filters.buyAsset, filters.sellAsset])

  const handleSwap = useCallback(() => {
    // Only swap if both filters are present
    if (!hasBothFilters) {
      return
    }

    // Swap the filters first
    swapBuySellAssets()

    // Invalidate queries after a brief delay to ensure state has updated
    // This forces an immediate refetch with the new swapped filter parameters
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orderBook'] })
      // Also refetch immediately
      queryClient.refetchQueries({ queryKey: ['orderBook'] })
    }, 10)
  }, [swapBuySellAssets, queryClient, hasBothFilters])

  return (
    <button
      type="button"
      onClick={handleSwap}
      disabled={!hasBothFilters}
      title={
        !hasBothFilters
          ? 'Select both buy and sell assets to swap'
          : assetsSwapped
            ? 'Revert to normal view'
            : 'Swap buy and sell assets'
      }
      className={`
        relative
        flex items-center justify-center
        w-8 h-8
        rounded-lg
        transition-all duration-300
        backdrop-blur-[20px]
        border-2
        ${assetsSwapped ? 'border-blue-400/60 dark:border-blue-500/60' : t.border}
        ${assetsSwapped ? 'bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-900/40 dark:to-blue-800/30' : `${t.card} bg-opacity-80`}
        shadow-lg
        ${hasBothFilters ? 'hover:scale-105 active:scale-95 cursor-pointer opacity-100' : 'opacity-50 cursor-not-allowed'}
        ${assetsSwapped ? 'shadow-blue-500/30 dark:shadow-blue-400/20' : 'shadow-black/10 dark:shadow-black/30'}
        group
      `}
      style={{
        boxShadow: assetsSwapped
          ? '0 8px 32px -4px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
          : '0 8px 32px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
      }}
    >
      {/* Pulsing glow effect when active */}
      {assetsSwapped && (
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
      <ArrowUpDown
        className={`
          relative z-10
          w-4 h-4
          transition-all duration-300
          ${assetsSwapped ? 'text-blue-600 dark:text-blue-400' : t.text}
          ${assetsSwapped ? 'rotate-180' : ''}
        `}
        style={{
          filter: assetsSwapped ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      />
    </button>
  )
}
