'use client'

import { formatAssetAmount, formatXchAmount } from '@/shared/lib/utils/chia-units'
import { getDexieStatusDescription, type OfferAsset } from '@/entities/offer'
import { useThemeClasses } from '@/shared/hooks'
import { formatPriceForDisplay } from '../../../lib/formatAmount'

interface OfferPreviewProps {
  offerPreview: {
    assetsOffered?: OfferAsset[]
    assetsRequested?: OfferAsset[]
    creatorAddress?: string
    fee?: number
    status?: string
    dexieStatus?: string
  }
  orderPrice: number | null
  priceDeviationPercent: number | null | undefined
  getPriceHeaderTicker: () => string
  getTickerSymbol: (assetId: string | undefined, symbol?: string) => string
  fee: number
}

export default function OfferPreview({
  offerPreview,
  orderPrice,
  priceDeviationPercent,
  getPriceHeaderTicker,
  getTickerSymbol,
  fee,
}: OfferPreviewProps) {
  const { t } = useThemeClasses()

  return (
    <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
      <h4 className={`text-xs font-medium ${t.text} mb-2`}>Offer Preview</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className={t.textSecondary}>You will receive:</span>
          <span className={t.text}>
            {offerPreview.assetsOffered && offerPreview.assetsOffered.length > 0
              ? offerPreview.assetsOffered
                  .map(
                    (a) =>
                      `${formatAssetAmount(a.amount, a.type)} ${getTickerSymbol(a.assetId, a.symbol)}`
                  )
                  .join(', ')
              : 'Assets from offer'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={t.textSecondary}>You will pay:</span>
          <span className={t.text}>
            {offerPreview.assetsRequested && offerPreview.assetsRequested.length > 0
              ? offerPreview.assetsRequested
                  .map(
                    (a) =>
                      `${formatAssetAmount(a.amount, a.type)} ${getTickerSymbol(a.assetId, a.symbol)}`
                  )
                  .join(', ')
              : 'Assets to offer creator'}
          </span>
        </div>
        {orderPrice !== null && (
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={`text-xs ${t.textSecondary}`}>Price:</span>
            <span className={`text-xs font-mono ${t.text}`}>
              {formatPriceForDisplay(orderPrice)} {getPriceHeaderTicker()}
            </span>
          </div>
        )}
        {priceDeviationPercent !== null && priceDeviationPercent !== undefined && (
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={`text-xs ${t.textSecondary}`}>Price Range:</span>
            <span
              className={`text-xs font-mono ${t.text} cursor-help`}
              title={`${priceDeviationPercent.toFixed(10)}%`}
            >
              {priceDeviationPercent < 0.01
                ? (() => {
                    const formatted = priceDeviationPercent.toFixed(10)
                    const trimmed = formatted.replace(/0+$/, '')
                    return `${trimmed.endsWith('.') ? `${trimmed}0` : trimmed}%`
                  })()
                : `${priceDeviationPercent.toFixed(2)}%`}
            </span>
          </div>
        )}
        <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
          <span className={`font-medium ${t.text}`}>Fee:</span>
          <span className={`font-medium ${t.text}`}>
            {formatXchAmount(offerPreview.fee !== undefined ? offerPreview.fee : fee)} XCH
          </span>
        </div>
        {offerPreview.dexieStatus && (
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={`font-medium ${t.text}`}>Status:</span>
            <span className={`font-medium ${t.text}`}>
              {getDexieStatusDescription(offerPreview.dexieStatus)}
            </span>
          </div>
        )}
        {offerPreview.creatorAddress && (
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={`font-medium ${t.text}`}>Creator:</span>
            <span className={`font-medium ${t.text} text-xs font-mono`}>
              {offerPreview.creatorAddress.slice(0, 8)}...
              {offerPreview.creatorAddress.slice(-8)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
