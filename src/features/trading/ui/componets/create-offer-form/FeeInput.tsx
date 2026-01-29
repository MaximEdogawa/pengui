import { formatXchAmount, getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import type { ThemeClasses } from '@/shared/lib/theme'

interface FeeInputProps {
  feeDisplayValue: string
  handleFeeChange: (value: string) => void
  handleFeeBlur: () => void
  feePlaceholder: string
  isSubmitting: boolean
  t: ThemeClasses
}

/**
 * Extract fee input section to reduce CreateOfferForm size
 */
export function FeeInput({
  feeDisplayValue,
  handleFeeChange,
  handleFeeBlur,
  feePlaceholder,
  isSubmitting,
  t,
}: FeeInputProps) {
  return (
    <div>
      <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
        Transaction Fee (XCH)
      </label>
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={feeDisplayValue}
        onChange={(e) => handleFeeChange(e.target.value)}
        onBlur={handleFeeBlur}
        placeholder={feePlaceholder}
        className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl`}
        disabled={isSubmitting}
      />
      <p className={`mt-1 text-xs ${t.textSecondary}`}>
        Fee can be 0 for free transactions (minimum: {formatXchAmount(getMinimumFeeInXch())} XCH)
      </p>
    </div>
  )
}
