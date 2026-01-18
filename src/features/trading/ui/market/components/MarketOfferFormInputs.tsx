'use client'

import { getAmountPlaceholder, getMinimumFeeInXch, formatAssetAmountForInput, formatXchAmount } from '@/shared/lib/utils/chia-units'
import { useThemeClasses } from '@/shared/hooks'

interface MarketOfferFormInputsProps {
  order?: unknown
  offerString: string
  setOfferString: (value: string) => void
  fee: number
  feeInput: string | undefined
  handleFeeChange: (value: string) => void
  handleFeeBlur: () => void
  isSubmitting: boolean
}

export default function MarketOfferFormInputs({
  order,
  offerString,
  setOfferString,
  fee,
  feeInput,
  handleFeeChange,
  handleFeeBlur,
  isSubmitting,
}: MarketOfferFormInputsProps) {
  const { t } = useThemeClasses()

  return (
    <>
      {/* Offer String Input - Show when no order is provided */}
      {!order && (
        <div>
          <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Offer String</label>
          <textarea
            value={offerString}
            onChange={(e) => setOfferString(e.target.value)}
            placeholder="Paste offer string here..."
            rows={6}
            className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl font-mono`}
            disabled={isSubmitting}
          />
          <p className={`mt-1 text-xs ${t.textSecondary}`}>
            Paste an offer string to take an offer from the marketplace.
          </p>
        </div>
      )}

      {/* Transaction Fee */}
      <div>
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
          Transaction Fee (XCH)
        </label>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          value={
            feeInput !== undefined
              ? feeInput
              : fee && fee > 0
                ? formatAssetAmountForInput(fee, 'xch')
                : ''
          }
          onChange={(e) => handleFeeChange(e.target.value)}
          onBlur={handleFeeBlur}
          placeholder={getAmountPlaceholder('xch')}
          className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl`}
          disabled={isSubmitting}
        />
        <p className={`mt-1 text-xs ${t.textSecondary}`}>
          Fee can be 0 for free transactions (minimum: {formatXchAmount(getMinimumFeeInXch())}{' '}
          XCH)
        </p>
      </div>
    </>
  )
}
