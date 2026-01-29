'use client'

import type { OfferDetails } from '@/entities/offer'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferInfoSectionProps {
  offer: OfferDetails
  formatDate: (date: Date) => string
  t: ThemeClasses
}

export function OfferInfoSection({ offer, formatDate, t }: OfferInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Transaction Fee</h4>
        <p className={`text-base font-semibold ${t.text}`}>{offer.fee || 0} XCH</p>
      </div>
      <div>
        <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Created</h4>
        <p className={`text-xs ${t.text}`}>{formatDate(offer.createdAt)}</p>
      </div>
      <div>
        <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Creator Address</h4>
        <p className={`text-xs ${t.text} font-mono break-all`}>
          {offer.creatorAddress || 'Unknown'}
        </p>
      </div>
      {offer.expiresAt && (
        <div>
          <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Expires</h4>
          <p className={`text-xs ${t.text}`}>{formatDate(offer.expiresAt)}</p>
        </div>
      )}
    </div>
  )
}
