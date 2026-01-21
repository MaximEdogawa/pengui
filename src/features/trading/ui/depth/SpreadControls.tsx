import { useRef, useCallback, useEffect } from 'react'
import type { MarketDepthData } from '../../lib/chartTypes'
import { formatPriceForDisplay } from '../../lib/formatAmount'

interface SpreadControlsProps {
  depthData: MarketDepthData
  maxSpreadPercent: number
  onMaxSpreadChange: (value: number) => void
  onReset: () => void
}

export default function SpreadControls({
  depthData,
  maxSpreadPercent,
  onMaxSpreadChange,
  onReset,
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
    onMaxSpreadChange(Math.max(minAllowed, currentValue - 1))
  }, [onMaxSpreadChange])

  const handleIncrease = useCallback(() => {
    const currentValue = maxSpreadPercentRef.current
    onMaxSpreadChange(Math.min(200, currentValue + 1))
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
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
      <div className="px-3 py-2 bg-white/[0.03] dark:bg-black/30 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div className="flex flex-col gap-2.5">
          {/* Top Row: Bid | Spread (Center) | Ask */}
          <div className="flex items-center justify-center gap-6">
            {/* Best Bid */}
            <div className="flex flex-col gap-0.5 items-center min-w-[75px]">
              <span className="text-[#868993] dark:text-[#868993] text-[8px] font-medium uppercase tracking-wider">Bid</span>
              <span className="text-[#26a69a] dark:text-[#26a69a] font-mono font-semibold text-xs leading-tight break-all text-center">
                {formatPriceForDisplay(depthData.bestBid)}
              </span>
            </div>

            {/* Spread - Centered */}
            <div className="flex flex-col gap-0.5 items-center min-w-[100px]">
              <span className="text-[#868993] dark:text-[#868993] text-[8px] font-medium uppercase tracking-wider">Spread</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[#d1d4dc] dark:text-[#d1d4dc] font-mono font-semibold text-xs">
                  {formatPriceForDisplay(depthData.spread)}
                </span>
                <span className="text-[#868993] dark:text-[#868993] font-mono text-[9px]">
                  ({depthData.spreadPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Best Ask */}
            <div className="flex flex-col gap-0.5 items-center min-w-[75px]">
              <span className="text-[#868993] dark:text-[#868993] text-[8px] font-medium uppercase tracking-wider">Ask</span>
              <span className="text-[#ef5350] dark:text-[#ef5350] font-mono font-semibold text-xs leading-tight break-all text-center">
                {formatPriceForDisplay(depthData.bestAsk)}
              </span>
            </div>
          </div>

          {/* Bottom Row: Max Spread Controls */}
          <div className="flex flex-col gap-1 items-center pt-1.5 border-t border-white/10 dark:border-white/5">
            <span className="text-[#868993] dark:text-[#868993] text-[8px] font-medium uppercase tracking-wider">Max Spread</span>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={startDecrease}
                onMouseUp={stopInterval}
                onMouseLeave={stopInterval}
                onTouchStart={startDecrease}
                onTouchEnd={stopInterval}
                className="w-5 h-5 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-md transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold select-none"
                title="Decrease max spread (hold to repeat)"
                disabled={maxSpreadPercent <= depthData.spreadPercent + 0.1}
              >
                −
              </button>
              <span className="text-[#d1d4dc] dark:text-[#d1d4dc] font-mono font-semibold text-xs min-w-[2.5rem] text-center">
                {maxSpreadPercent.toFixed(1)}%
              </span>
              <button
                onMouseDown={startIncrease}
                onMouseUp={stopInterval}
                onMouseLeave={stopInterval}
                onTouchStart={startIncrease}
                onTouchEnd={stopInterval}
                className="w-5 h-5 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-md transition-all duration-150 text-xs font-semibold select-none"
                title="Increase max spread (hold to repeat)"
              >
                +
              </button>
              <button
                onClick={onReset}
                className="w-5 h-5 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#868993] dark:text-[#868993] rounded-md transition-all duration-150 text-[10px] font-medium select-none ml-0.5"
                title="Reset to default max spread"
              >
                ↺
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
