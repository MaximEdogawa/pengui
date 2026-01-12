'use client'

import { useCatTokens } from '@/shared/hooks/useTickers'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { useMemo } from 'react'
import { formatAmountForTooltip } from '../../lib/formatAmount'
import type { OrderBookOrder } from '../../lib/orderBookTypes'

interface OrderTooltipProps {
  order: OrderBookOrder | null
  visible: boolean
  position: { x: number; y: number }
  direction: 'top' | 'bottom'
  priceDeviationPercent?: number | null
}

export default function OrderTooltip({
  order,
  visible,
  position,
  direction,
  priceDeviationPercent,
}: OrderTooltipProps) {
  const { getCatTokenInfo } = useCatTokens()

  const getTickerSymbol = (assetId: string, code?: string): string => {
    if (code) return code
    if (!assetId) return getNativeTokenTicker()
    const tickerInfo = getCatTokenInfo(assetId)
    return tickerInfo?.ticker || assetId.slice(0, 8)
  }

  const tooltipStyle = useMemo(() => {
    if (!visible || !order) return { display: 'none' }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = position.x + 10
    let top: number

    // Position tooltip based on direction
    if (direction === 'top') {
      // Tooltip appears above - estimate height as 200px
      top = position.y - 200 - 10
    } else {
      // Tooltip appears below
      top = position.y + 10
    }

    // Adjust if tooltip would go off screen horizontally
    if (left + 300 > viewportWidth) {
      left = position.x - 300 - 10
    }

    // Adjust if tooltip would go off screen vertically
    if (direction === 'top' && top < 10) {
      // If top tooltip would go off top, show it below instead
      top = position.y + 10
    } else if (direction === 'bottom' && top + 200 > viewportHeight) {
      // If bottom tooltip would go off bottom, show it above instead
      top = position.y - 200 - 10
    }

    // Ensure tooltip doesn't go off the left edge
    if (left < 10) {
      left = 10
    }

    // Ensure tooltip doesn't go off the top edge
    if (top < 10) {
      top = 10
    }

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 50,
    }
  }, [visible, order, position, direction])

  if (!visible || !order) {
    return null
  }

  return (
    <div
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 shadow-xl min-w-[300px] max-w-[500px] pointer-events-none"
      style={tooltipStyle}
    >
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Order Details</div>

        {/* Order ID */}
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">ID:</span>
          <span className="text-xs font-mono text-gray-900 dark:text-white ml-1 break-all">
            {order.id}
          </span>
        </div>

        {/* Offering Assets */}
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Offering:</span>
          <div className="mt-1 space-y-1">
            {order.offering.map((asset, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-900 dark:text-white">
                  {asset.code || getTickerSymbol(asset.id)}
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {formatAmountForTooltip(asset.amount || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Requested Assets */}
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Requested:</span>
          <div className="mt-1 space-y-1">
            {order.requesting.map((asset, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-900 dark:text-white">
                  {asset.code || getTickerSymbol(asset.id)}
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {formatAmountForTooltip(asset.amount || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Percentage */}
        {priceDeviationPercent !== null && priceDeviationPercent !== undefined && (
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Price Range:</span>
            <span className="text-xs font-mono text-gray-900 dark:text-white ml-1">
              {priceDeviationPercent < 0.01
                ? (() => {
                    // Show full precision up to 10 decimal places, remove trailing zeros
                    const formatted = priceDeviationPercent.toFixed(10)
                    // Remove trailing zeros after decimal point, but keep at least .0
                    const trimmed = formatted.replace(/0+$/, '')
                    return `${trimmed.endsWith('.') ? `${trimmed}0` : trimmed}%`
                  })()
                : `${priceDeviationPercent.toFixed(2)}%`}
            </span>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(order.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
