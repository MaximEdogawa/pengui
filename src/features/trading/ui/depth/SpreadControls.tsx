import { useRef, useCallback, useEffect } from 'react'
import type { MarketDepthData } from '../../lib/chartTypes'
import { formatPriceForDisplay } from '../../lib/formatAmount'

interface SpreadControlsProps {
  depthData: MarketDepthData
  maxSpreadPercent: number
  onMaxSpreadChange: (value: number) => void
  priceRange: { min: number; max: number }
}

export default function SpreadControls({
  depthData,
  maxSpreadPercent,
  onMaxSpreadChange,
  priceRange,
}: SpreadControlsProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxSpreadPercentRef = useRef(maxSpreadPercent)
  const depthDataRef = useRef(depthData)

  // Keep refs updated with current values
  useEffect(() => {
    maxSpreadPercentRef.current = maxSpreadPercent
    depthDataRef.current = depthData
  }, [maxSpreadPercent, depthData])

  const handleDecrease = useCallback(() => {
    const minAllowed = depthDataRef.current.spreadPercent + 0.1
    const currentValue = maxSpreadPercentRef.current
    onMaxSpreadChange(Math.max(minAllowed, currentValue - 0.5))
  }, [onMaxSpreadChange])

  const handleIncrease = useCallback(() => {
    const currentValue = maxSpreadPercentRef.current
    onMaxSpreadChange(Math.min(50, currentValue + 0.5))
  }, [onMaxSpreadChange])

  const startDecrease = useCallback(() => {
    // Stop any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    // Execute immediately
    handleDecrease()
    // Start interval for continuous adjustment
    intervalRef.current = setInterval(handleDecrease, 100)
  }, [handleDecrease])

  const startIncrease = useCallback(() => {
    // Stop any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    // Execute immediately
    handleIncrease()
    // Start interval for continuous adjustment
    intervalRef.current = setInterval(handleIncrease, 100)
  }, [handleIncrease])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  if (!depthData.bestBid || !depthData.bestAsk) return null

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
      <div className="px-4 py-2.5 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-white/5 shadow-2xl">
        <div className="flex items-center gap-6 text-[11px]">
          {/* Best Bid */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-[#868993] dark:text-[#868993] text-[10px] font-medium uppercase tracking-wider text-center">Bid</span>
            <span className="text-[#26a69a] dark:text-[#26a69a] font-mono font-semibold text-sm leading-tight">
              {formatPriceForDisplay(depthData.bestBid)}
            </span>
          </div>

          {/* Spread */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-[#868993] dark:text-[#868993] text-[10px] font-medium uppercase tracking-wider text-center">Spread</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#d1d4dc] dark:text-[#d1d4dc] font-mono font-semibold text-sm leading-tight">
                {formatPriceForDisplay(depthData.spread)}
              </span>
              <span className="text-[#868993] dark:text-[#868993] font-mono text-xs">
                ({depthData.spreadPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Best Ask */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-[#868993] dark:text-[#868993] text-[10px] font-medium uppercase tracking-wider text-center">Ask</span>
            <span className="text-[#ef5350] dark:text-[#ef5350] font-mono font-semibold text-sm leading-tight">
              {formatPriceForDisplay(depthData.bestAsk)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-white/10 dark:bg-white/5" />

          {/* Max Spread Controls */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 items-center">
              <span className="text-[#868993] dark:text-[#868993] text-[10px] font-medium uppercase tracking-wider text-center">Max</span>
              <div className="flex items-center gap-1.5">
                <button
                  onMouseDown={startDecrease}
                  onMouseUp={stopInterval}
                  onMouseLeave={stopInterval}
                  onTouchStart={startDecrease}
                  onTouchEnd={stopInterval}
                  className="w-6 h-6 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium select-none"
                  title="Decrease max spread (hold to repeat)"
                  disabled={maxSpreadPercent <= depthData.spreadPercent + 0.1}
                >
                  −
                </button>
                <span className="text-[#d1d4dc] dark:text-[#d1d4dc] font-mono font-semibold text-sm min-w-[2.5rem] text-center">
                  {maxSpreadPercent.toFixed(1)}%
                </span>
                <button
                  onMouseDown={startIncrease}
                  onMouseUp={stopInterval}
                  onMouseLeave={stopInterval}
                  onTouchStart={startIncrease}
                  onTouchEnd={stopInterval}
                  className="w-6 h-6 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-lg transition-all duration-150 text-sm font-medium select-none"
                  title="Increase max spread (hold to repeat)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-[#868993] dark:text-[#868993] text-[10px] font-medium uppercase tracking-wider text-center">Range</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#868993] dark:text-[#868993] font-mono text-xs">
                {formatPriceForDisplay(priceRange.min)}
              </span>
              <span className="text-[#868993] dark:text-[#868993] text-[10px]">-</span>
              <span className="text-[#868993] dark:text-[#868993] font-mono text-xs">
                {formatPriceForDisplay(priceRange.max)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
