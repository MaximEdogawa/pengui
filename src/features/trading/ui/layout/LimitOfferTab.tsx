'use client'

import { useCatTokens, useThemeClasses } from '@/shared/hooks'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { useMemo } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'

interface LimitOfferTabProps {
  activeMode: 'maker' | 'taker'
  onModeChange: (mode: 'maker' | 'taker') => void
  selectedOrder?: OrderBookOrder | null
  filters?: { buyAsset?: string[]; sellAsset?: string[] }
}

export default function LimitOfferTab({
  activeMode,
  onModeChange,
  selectedOrder,
  filters,
}: LimitOfferTabProps) {
  const { t, isDark } = useThemeClasses()
  const { getCatTokenInfo } = useCatTokens()

  // Determine if order is buy or sell
  const orderType = useMemo(() => {
    if (!selectedOrder || !filters?.buyAsset || !filters?.sellAsset) {
      return null
    }

    const buyAssets = filters.buyAsset || []
    const sellAssets = filters.sellAsset || []

    if (buyAssets.length === 0 || sellAssets.length === 0) {
      return null
    }

    // Helper to get ticker symbol
    const getTickerSymbol = (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    }

    // Check if requesting side matches buy asset
    const requestingIsBuyAsset = selectedOrder.requesting.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // Check if offering side matches buy asset
    const offeringIsBuyAsset = selectedOrder.offering.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // For Market tab (taker's perspective):
    // If maker is requesting buyAsset (offering sellAsset), taker is SELLING buyAsset
    // If maker is offering buyAsset (requesting sellAsset), taker is BUYING buyAsset
    // For Limit tab (maker's perspective):
    // If maker is requesting buyAsset, maker is SELLING buyAsset
    // If maker is offering buyAsset, maker is BUYING buyAsset
    if (activeMode === 'taker') {
      // Market tab: taker's perspective
      if (requestingIsBuyAsset && !offeringIsBuyAsset) {
        return 'sell' // Maker wants buyAsset, so taker is selling it
      } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
        return 'buy' // Maker is giving buyAsset, so taker is buying it
      }
    } else {
      // Limit tab: maker's perspective
      if (requestingIsBuyAsset && !offeringIsBuyAsset) {
        return 'sell' // Maker is requesting buyAsset, so maker is selling it
      } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
        return 'buy' // Maker is offering buyAsset, so maker is buying it
      }
    }

    return null
  }, [selectedOrder, filters, getCatTokenInfo, activeMode])

  return (
    <div
      className={`mb-1 backdrop-blur-[40px] ${t.card} rounded-lg p-0.5 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex gap-0.5">
        <button
          type="button"
          onClick={() => onModeChange('maker')}
          className={`flex-1 px-2 py-1 rounded-md transition-all duration-200 font-medium text-xs relative overflow-hidden ${
            activeMode === 'maker'
              ? isDark
                ? 'bg-white/10 text-white backdrop-blur-xl'
                : 'bg-white/50 text-slate-800 backdrop-blur-xl'
              : `${t.textSecondary} ${t.cardHover}`
          }`}
        >
          {activeMode === 'maker' && (
            <>
              <div
                className={`absolute inset-0 backdrop-blur-xl ${
                  isDark ? 'bg-white/10' : 'bg-white/30'
                } rounded-md`}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b ${
                  isDark ? 'from-white/5' : 'from-white/20'
                } to-transparent rounded-md`}
              />
            </>
          )}
          <span className="relative">
            Limit
            {orderType && (
              <span
                className={`ml-1 text-[9px] font-normal ${
                  orderType === 'buy'
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                ({orderType === 'buy' ? 'Buy' : 'Sell'})
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onModeChange('taker')}
          className={`flex-1 px-2 py-1 rounded-md transition-all duration-200 font-medium text-xs relative overflow-hidden ${
            activeMode === 'taker'
              ? isDark
                ? 'bg-white/10 text-white backdrop-blur-xl'
                : 'bg-white/50 text-slate-800 backdrop-blur-xl'
              : `${t.textSecondary} ${t.cardHover}`
          }`}
        >
          {activeMode === 'taker' && (
            <>
              <div
                className={`absolute inset-0 backdrop-blur-xl ${
                  isDark ? 'bg-white/10' : 'bg-white/30'
                } rounded-md`}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b ${
                  isDark ? 'from-white/5' : 'from-white/20'
                } to-transparent rounded-md`}
              />
            </>
          )}
          <span className="relative">
            Market
            {orderType && (
              <span
                className={`ml-1 text-[9px] font-normal ${
                  orderType === 'buy'
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                ({orderType === 'buy' ? 'Buy' : 'Sell'})
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
