'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useMarketDepth } from '../../model/useMarketDepth'
import MarketDepthChart from './MarketDepthChart'
import type { OrderBookFilters } from '../../lib/orderBookTypes'
import { useThemeClasses } from '@/shared/hooks'

interface MarketDepthViewProps {
  filters?: OrderBookFilters
  onPriceClick?: (price: number) => void
}

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center bg-[#131722] rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#868993]" />
        <p className="text-sm text-[#868993]">Loading market depth...</p>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center bg-[#131722] rounded-lg">
      <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
        <AlertCircle className="w-8 h-8 text-[#ef5350]" />
        <div>
          <p className="text-sm font-medium text-[#d1d4dc] mb-1">Failed to load market depth</p>
          <p className="text-xs text-[#868993] mb-4">
            {error?.message || 'An error occurred while fetching order book data'}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#2962ff] hover:bg-[#2962ff]/80 text-white text-sm rounded-md transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-[#131722] rounded-lg">
      <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
        <p className="text-sm text-[#868993]">No order book data available</p>
        <p className="text-xs text-[#868993] opacity-75">
          The order book is currently empty. Try adjusting your filters or check back later.
        </p>
      </div>
    </div>
  )
}

export default function MarketDepthView({ filters, onPriceClick }: MarketDepthViewProps) {
  const { t } = useThemeClasses()
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { depthData, isLoading, isError, error, refetch } = useMarketDepth({ filters })

  // Calculate chart size based on container
  useEffect(() => {
    const updateSize = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect()
        setChartSize({
          width: rect.width,
          height: rect.height,
        })
      }
    }

    updateSize()
    
    // Use ResizeObserver for more accurate size tracking
    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })
    
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current)
    }
    
    window.addEventListener('resize', updateSize)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  const handlePriceClick = useCallback(
    (price: number) => {
      onPriceClick?.(price)
    },
    [onPriceClick]
  )

  // Loading state
  if (isLoading) {
    return <LoadingState />
  }

  // Error state
  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  // Empty state
  if (depthData.bids.length === 0 && depthData.asks.length === 0) {
    return <EmptyState />
  }

  return (
    <div className={`h-full flex flex-col ${t.card} rounded-lg overflow-hidden`}>
      {/* Chart Section */}
      <div ref={chartContainerRef} className="flex-1 min-h-[400px] relative">
        {chartSize.width > 0 && chartSize.height > 0 && (
          <MarketDepthChart
            depthData={depthData}
            width={chartSize.width}
            height={chartSize.height}
            onPriceClick={handlePriceClick}
          />
        )}
      </div>
    </div>
  )
}
