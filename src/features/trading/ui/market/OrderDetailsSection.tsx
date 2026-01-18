'use client'

import { useCatTokens } from '@/entities/asset'
import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useCallback } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { CopyableField } from './OrderDetailsSection/components/CopyableField'
import { AssetList } from './OrderDetailsSection/components/AssetList'

interface OrderDetailsSectionProps {
  order: OrderBookOrder
  offerString?: string
  mode?: 'modal' | 'inline'
  priceDeviationPercent?: number | null
}

export default function OrderDetailsSection({
  order,
  offerString,
  mode = 'inline',
  priceDeviationPercent,
}: OrderDetailsSectionProps) {
  const { getCatTokenInfo } = useCatTokens()
  const { network } = useNetwork()

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTickerForNetwork(network)
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo, network]
  )

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">Offer Details</div>

      {/* Offer ID */}
      <CopyableField label="Offer ID" value={order.id} />

      {/* Offer String */}
      {offerString && (
        <CopyableField
          label="Offer String"
          value={offerString}
          className="max-h-32 overflow-y-auto"
        />
      )}

      {/* Maker Address */}
      {order.maker && <CopyableField label="Trade ID Hash" value={order.maker} />}

      {/* Offering Assets */}
      <AssetList
        label="Buy (Offering)"
        assets={order.offering}
        getTickerSymbol={getTickerSymbol}
      />

      {/* Requesting Assets */}
      <AssetList
        label="Sell (Requesting)"
        assets={order.requesting}
        getTickerSymbol={getTickerSymbol}
      />

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

      {/* Timestamp */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {new Date(order.timestamp).toLocaleString()}
      </div>

      {/* Status */}
      {order.status !== undefined && (
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
          <span className="text-xs text-gray-900 dark:text-white ml-1">{order.status}</span>
        </div>
      )}
    </div>
  )
}
