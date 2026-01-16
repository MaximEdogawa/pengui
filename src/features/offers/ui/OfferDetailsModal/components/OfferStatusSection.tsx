'use client'

import type { OfferDetails } from '@/entities/offer'
import { getDexieStatusDescription } from '@/shared/lib/utils/offerUtils'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferStatusSectionProps {
  offer: OfferDetails
  getStatusClass: (status: string) => string
  isCopied: boolean
  onCopyOfferId: () => void
  t: ThemeClasses
}

export function OfferStatusSection({
  offer,
  getStatusClass,
  isCopied,
  onCopyOfferId,
  t,
}: OfferStatusSectionProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center space-x-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(offer.status)}`}
        >
          {offer.status.toUpperCase()}
        </span>
        {offer.uploadedToDexie &&
          offer.dexieStatus !== undefined &&
          offer.dexieStatus !== null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Dexie: {getDexieStatusDescription(offer.dexieStatus)}
            </span>
          )}
      </div>
      <div className="flex flex-col sm:items-end">
        <p className={`text-xs ${t.textSecondary} mb-0.5`}>Offer ID</p>
        <button
          onClick={onCopyOfferId}
          className={`text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-0.5 rounded font-mono transition-all duration-300 cursor-pointer group relative overflow-hidden max-w-[200px] sm:max-w-[250px] ${
            isCopied
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : ''
          }`}
          title={isCopied ? 'Copied!' : 'Click to copy offer ID'}
        >
          <span className="transition-all duration-300 truncate block">
            {offer.tradeId?.slice(0, 12) || 'Unknown'}...
          </span>
        </button>
      </div>
    </div>
  )
}
