import { formatXchAmount } from '@/shared/lib/utils/chia-units'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferPreviewProps {
  previewOffered: string
  previewRequested: string
  fee: number
  t: ThemeClasses
}

/**
 * Extract offer preview section to reduce CreateOfferForm size
 */
export function OfferPreview({ previewOffered, previewRequested, fee, t }: OfferPreviewProps) {
  return (
    <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
      <h4 className={`text-xs font-medium ${t.text} mb-2`}>Offer Preview</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className={t.textSecondary}>You will offer:</span>
          <span className={t.text}>{previewOffered || 'No assets'}</span>
        </div>
        <div className="flex justify-between">
          <span className={t.textSecondary}>You will receive:</span>
          <span className={t.text}>{previewRequested || 'No assets'}</span>
        </div>
        <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
          <span className={`font-medium ${t.text}`}>Fee:</span>
          <span className={`font-medium ${t.text}`}>{formatXchAmount(fee)} XCH</span>
        </div>
      </div>
    </div>
  )
}
