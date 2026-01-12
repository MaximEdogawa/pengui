'use client'

import { useCatTokens } from '@/shared/hooks/useTickers'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { copyToClipboard } from '@/shared/lib/utils/clipboard'
import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'
import { formatAmountForTooltip } from '../../lib/formatAmount'
import type { OrderBookOrder } from '../../lib/orderBookTypes'

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
  const [copiedId, setCopiedId] = useState(false)
  const [copiedOfferString, setCopiedOfferString] = useState(false)
  const [copiedMakerId, setCopiedMakerId] = useState(false)

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  const handleCopyId = useCallback(async () => {
    const result = await copyToClipboard(order.id)
    if (result.success) {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }, [order.id])

  const handleCopyOfferString = useCallback(async () => {
    if (!offerString) return
    const result = await copyToClipboard(offerString)
    if (result.success) {
      setCopiedOfferString(true)
      setTimeout(() => setCopiedOfferString(false), 2000)
    }
  }, [offerString])

  const handleCopyMakerId = useCallback(async () => {
    if (!order.maker) return
    const result = await copyToClipboard(order.maker)
    if (result.success) {
      setCopiedMakerId(true)
      setTimeout(() => setCopiedMakerId(false), 2000)
    }
  }, [order.maker])

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">Offer Details</div>

      {/* Offer ID */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Offer ID:</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {copiedId ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="text-xs font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
          {order.id}
        </div>
      </div>

      {/* Offer String */}
      {offerString && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Offer String:</span>
            <button
              type="button"
              onClick={handleCopyOfferString}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {copiedOfferString ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div
            className="text-xs font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800/50 p-2 rounded max-h-32 overflow-y-auto"
            style={{ scrollbarGutter: 'stable' }}
          >
            {offerString}
          </div>
        </div>
      )}

      {/* Maker Address */}
      {order.maker && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Trade ID Hash:</span>
            <button
              type="button"
              onClick={handleCopyMakerId}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {copiedMakerId ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="text-xs font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
            {order.maker}
          </div>
        </div>
      )}

      {/* Offering Assets */}
      <div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Buy (Offering):</span>
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

      {/* Requesting Assets */}
      <div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Sell (Requesting):</span>
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
