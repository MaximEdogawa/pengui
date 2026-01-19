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
                  onClick={() => {
                    const minAllowed = depthData.spreadPercent + 0.1
                    onMaxSpreadChange(Math.max(minAllowed, maxSpreadPercent - 0.5))
                  }}
                  className="w-6 h-6 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                  title="Decrease max spread"
                  disabled={maxSpreadPercent <= depthData.spreadPercent + 0.1}
                >
                  −
                </button>
                <span className="text-[#d1d4dc] dark:text-[#d1d4dc] font-mono font-semibold text-sm min-w-[2.5rem] text-center">
                  {maxSpreadPercent.toFixed(1)}%
                </span>
                <button
                  onClick={() => onMaxSpreadChange(Math.min(50, maxSpreadPercent + 0.5))}
                  className="w-6 h-6 flex items-center justify-center bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 active:bg-white/15 dark:active:bg-white/15 text-[#d1d4dc] dark:text-[#d1d4dc] rounded-lg transition-all duration-150 text-sm font-medium"
                  title="Increase max spread"
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
