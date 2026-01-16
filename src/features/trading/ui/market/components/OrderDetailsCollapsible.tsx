'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useEffect, useState } from 'react'
import type { OrderBookOrder } from '../../../lib/orderBookTypes'
import OrderDetailsSection from '../OrderDetailsSection'

interface OrderDetailsCollapsibleProps {
  order: OrderBookOrder
  offerString: string
  mode?: 'modal' | 'inline'
  priceDeviationPercent: number | null | undefined
}

export default function OrderDetailsCollapsible({
  order,
  offerString,
  mode,
  priceDeviationPercent,
}: OrderDetailsCollapsibleProps) {
  const { t } = useThemeClasses()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setIsExpanded(false)
  }, [order?.id])

  return (
    <div className={`rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-3 flex items-center justify-between ${t.cardHover} transition-colors`}
      >
        <span className={`text-sm font-medium ${t.text}`}>Offer Details</span>
        <svg
          className={`w-4 h-4 ${t.textSecondary} transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700" style={{ scrollbarGutter: 'stable' }}>
          <OrderDetailsSection
            order={order}
            offerString={offerString}
            mode={mode}
            priceDeviationPercent={priceDeviationPercent}
          />
        </div>
      )}
    </div>
  )
}
