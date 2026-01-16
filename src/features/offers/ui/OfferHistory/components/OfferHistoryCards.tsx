'use client'

import { Eye, X as XIcon } from 'lucide-react'
import type { OfferDetails } from '@/entities/offer'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferHistoryCardsProps {
  offers: OfferDetails[]
  getStatusClass: (status: string) => string
  formatDate: (date: Date) => string
  getTickerSymbol: (assetId: string) => string
  isCopied: string | null | undefined
  onCopyOfferString: (offerString: string) => Promise<void>
  onViewOffer: (offer: OfferDetails) => void
  onCancelOffer: (offer: OfferDetails) => void
  t: ThemeClasses
}

export function OfferHistoryCards({
  offers,
  getStatusClass,
  formatDate,
  getTickerSymbol,
  isCopied,
  onCopyOfferString,
  onViewOffer,
  onCancelOffer,
  t,
}: OfferHistoryCardsProps) {
  return (
    <div className="md:hidden space-y-4 pb-8">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => onCopyOfferString(offer.offerString)}
              className={`bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-xs font-mono transition-all duration-300 cursor-pointer group relative overflow-hidden max-w-[200px] sm:max-w-[250px] ${
                isCopied === offer.offerString
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : ''
              }`}
              title={isCopied === offer.offerString ? 'Copied!' : 'Click to copy offer string'}
            >
              <span className="transition-all duration-300 truncate block">
                {offer.offerString?.slice(0, 12) || 'Unknown'}...
              </span>
            </button>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusClass(offer.status)}`}
            >
              {offer.status}
            </span>
          </div>

          <div className="mb-3">
            <div className={`text-xs font-medium ${t.textSecondary} mb-2`}>
              Assets Offered ({(offer.assetsOffered || []).length})
            </div>
            <div className="space-y-1">
              {(offer.assetsOffered || []).slice(0, 3).map((asset, idx) => (
                <div
                  key={`mobile-offered-${asset.assetId}-${idx}`}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="font-medium">
                    {formatAssetAmount(asset.amount, asset.type)}
                  </span>
                  <span className={t.textSecondary}>{getTickerSymbol(asset.assetId)}</span>
                </div>
              ))}
              {(offer.assetsOffered || []).length > 3 && (
                <div className={`text-xs ${t.textSecondary} font-medium`}>
                  +{(offer.assetsOffered || []).length - 3} more assets
                </div>
              )}
            </div>
          </div>

          <div
            className={`flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700`}
          >
            <span className={`text-xs ${t.textSecondary}`}>{formatDate(offer.createdAt)}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onViewOffer(offer)}
                className={`text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs flex items-center`}
              >
                <Eye size={12} className="mr-1" />
                View
              </button>
              {offer.status === 'active' && (
                <button
                  onClick={() => onCancelOffer(offer)}
                  className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs flex items-center`}
                >
                  <XIcon size={12} className="mr-1" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
