'use client'

import type { OfferDetails } from '@/entities/offer'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferAssetsSectionProps {
  offer: OfferDetails
  getTickerSymbol: (assetId: string) => string
  t: ThemeClasses
}

export function OfferAssetsSection({
  offer,
  getTickerSymbol,
  t,
}: OfferAssetsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Assets Offered */}
      <div>
        <h3 className={`text-base font-medium ${t.text} mb-2`}>
          Assets Offered ({(offer.assetsOffered || []).length})
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {(offer.assetsOffered || []).map((asset, index) => (
            <div
              key={`offered-${index}`}
              className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${t.text} text-base`}>
                    {formatAssetAmount(asset.amount, asset.type)}
                  </span>
                  <span className={`text-xs font-medium ${t.textSecondary}`}>
                    {asset.assetId
                      ? getTickerSymbol(asset.assetId)
                      : asset.symbol || asset.type.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  {asset.type.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assets Requested */}
      <div>
        <h3 className={`text-base font-medium ${t.text} mb-2`}>
          Assets Requested ({(offer.assetsRequested || []).length})
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {(offer.assetsRequested || []).map((asset, index) => (
            <div
              key={`requested-${index}`}
              className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${t.text} text-base`}>
                    {formatAssetAmount(asset.amount, asset.type)}
                  </span>
                  <span className={`text-xs font-medium ${t.textSecondary}`}>
                    {asset.assetId
                      ? getTickerSymbol(asset.assetId)
                      : asset.symbol || asset.type.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {asset.type.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
