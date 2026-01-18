'use client'

import { Eye, X as XIcon } from 'lucide-react'
import type { OfferDetails } from '@/entities/offer'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferHistoryTableProps {
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

export function OfferHistoryTable({
  offers,
  getStatusClass,
  formatDate,
  getTickerSymbol,
  isCopied,
  onCopyOfferString,
  onViewOffer,
  onCancelOffer,
  t,
}: OfferHistoryTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`border-b border-gray-200 dark:border-gray-700`}>
            <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
              Offer String
            </th>
            <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
              Status
            </th>
            <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
              Assets
            </th>
            <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
              Created
            </th>
            <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr
              key={offer.id}
              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50`}
            >
              <td className="py-3 px-4 text-sm">
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
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(offer.status)}`}
                >
                  {offer.status}
                </span>
              </td>
              <td className={`py-3 px-4 text-sm ${t.text}`}>
                <div className="space-y-1">
                  {(offer.assetsOffered || []).slice(0, 2).map((asset, idx) => (
                    <div
                      key={`offered-${asset.assetId}-${idx}`}
                      className="text-xs flex items-center justify-between"
                    >
                      <span className="font-medium">
                        {formatAssetAmount(asset.amount, asset.type)}
                      </span>
                      <span className={`${t.textSecondary} ml-2`}>
                        {getTickerSymbol(asset.assetId)}
                      </span>
                    </div>
                  ))}
                  {(offer.assetsOffered || []).length > 2 && (
                    <div className={`text-xs ${t.textSecondary} font-medium`}>
                      +{(offer.assetsOffered || []).length - 2} more
                    </div>
                  )}
                </div>
              </td>
              <td className={`py-3 px-4 text-sm ${t.textSecondary}`}>
                {formatDate(offer.createdAt)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewOffer(offer)}
                    className={`text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm flex items-center`}
                  >
                    <Eye size={14} className="mr-1" />
                    View
                  </button>
                  {offer.status === 'active' && (
                    <button
                      onClick={() => onCancelOffer(offer)}
                      className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center`}
                    >
                      <XIcon size={14} className="mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
