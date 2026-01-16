'use client'

import type { OfferDetails } from '@/entities/offer'
import { Check, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import Button from '@/shared/ui/Button'
import type { ThemeClasses } from '@/shared/lib/theme'
import { OfferStatusSection } from './OfferStatusSection'
import { OfferAssetsSection } from './OfferAssetsSection'
import { OfferInfoSection } from './OfferInfoSection'

interface OfferDetailsContentProps {
  offer: OfferDetails
  getStatusClass: (status: string) => string
  formatDate: (date: Date) => string
  getTickerSymbol: (assetId: string) => string
  isCopied: boolean
  uploadError: string
  validationError: string
  stateValidationError: string
  dexieUrl: string | null
  onCopyOfferString: () => void
  onCopyOfferId: () => void
  t: ThemeClasses
}

export function OfferDetailsContent({
  offer,
  getStatusClass,
  formatDate,
  getTickerSymbol,
  isCopied,
  uploadError,
  validationError,
  stateValidationError,
  dexieUrl,
  onCopyOfferString,
  onCopyOfferId,
  t,
}: OfferDetailsContentProps) {
  return (
    <div className="space-y-3">
      <OfferStatusSection
        offer={offer}
        getStatusClass={getStatusClass}
        isCopied={isCopied}
        onCopyOfferId={onCopyOfferId}
        t={t}
      />

      <OfferAssetsSection offer={offer} getTickerSymbol={getTickerSymbol} t={t} />

      {/* Offer String */}
      <div>
        <h3 className={`text-base font-medium ${t.text} mb-2`}>Offer String</h3>
        <div className="relative">
          <textarea
            value={offer.offerString}
            readOnly
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 ${t.text} text-xs font-mono resize-none`}
          />
          <button
            onClick={onCopyOfferString}
            className={`absolute top-2 right-2 p-2 ${t.textSecondary} hover:${t.text}`}
            title={isCopied ? 'Copied!' : 'Copy offer string'}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <OfferInfoSection offer={offer} formatDate={formatDate} t={t} />

      {/* Upload Success Display */}
      {offer.dexieOfferId && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-start">
            <CheckCircle className="text-green-500 mr-2 mt-0.5" size={16} />
            <div className="flex-1">
              <h4 className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                ✅ Successfully uploaded to Dexie!
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                Your offer is now live on the Dexie marketplace and can be discovered by other
                traders.
              </p>
              {dexieUrl && (
                <a href={dexieUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button
                    variant="success"
                    icon={ExternalLink}
                    size="sm"
                    className="pointer-events-none"
                  >
                    View on Dexie.space
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Displays */}
      {uploadError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <span className="text-xs text-red-700 dark:text-red-300">{uploadError}</span>
          </div>
        </div>
      )}

      {validationError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <span className="text-xs text-red-700 dark:text-red-300">{validationError}</span>
          </div>
        </div>
      )}

      {stateValidationError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <span className="text-xs text-red-700 dark:text-red-300">{stateValidationError}</span>
          </div>
        </div>
      )}
    </div>
  )
}
