'use client'

import { useState } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import type { MarketDepthLevel } from '../../lib/chartTypes'
import { formatPriceForDisplay } from '../../lib/formatAmount'

interface ExcludedOffersIndicatorProps {
  excludedBids?: MarketDepthLevel[]
  excludedAsks?: MarketDepthLevel[]
}

export default function ExcludedOffersIndicator({
  excludedBids,
  excludedAsks,
}: ExcludedOffersIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasExcluded = (excludedBids && excludedBids.length > 0) || (excludedAsks && excludedAsks.length > 0)

  if (!hasExcluded) return null

  const totalExcluded = (excludedBids?.length || 0) + (excludedAsks?.length || 0)

  return (
    <div className="absolute top-2 right-2 z-20">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg transition-all duration-150 text-xs text-amber-400"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">{totalExcluded} Excluded</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-[#1e222d] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-30">
            <div className="max-h-96 overflow-y-auto">
              {excludedBids && excludedBids.length > 0 && (
                <div className="p-3 border-b border-white/10">
                  <div className="text-xs font-semibold text-[#868993] mb-2 uppercase tracking-wider">
                    Excluded Bids ({excludedBids.length})
                  </div>
                  <div className="space-y-1">
                    {excludedBids.map((bid, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5">
                        <span className="text-[#26a69a] font-mono">
                          {formatPriceForDisplay(bid.price)}
                        </span>
                        <span className="text-[#868993]">
                          {bid.quantity.toLocaleString()} ({bid.orderCount})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {excludedAsks && excludedAsks.length > 0 && (
                <div className="p-3">
                  <div className="text-xs font-semibold text-[#868993] mb-2 uppercase tracking-wider">
                    Excluded Asks ({excludedAsks.length})
                  </div>
                  <div className="space-y-1">
                    {excludedAsks.map((ask, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5">
                        <span className="text-[#ef5350] font-mono">
                          {formatPriceForDisplay(ask.price)}
                        </span>
                        <span className="text-[#868993]">
                          {ask.quantity.toLocaleString()} ({ask.orderCount})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
