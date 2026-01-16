import { useThemeClasses } from '@/shared/hooks'
import {
  formatAssetAmountForInput,
  formatXchAmount,
  getAmountPlaceholder,
  getMinimumFeeInXch,
} from '@/shared/lib/utils/chia-units'

interface FeeInputProps {
  fee: number
  feeInput: string | undefined
  onFeeChange: (value: string) => void
  onFeeBlur: () => void
  isSubmitting: boolean
}

export function FeeInput({ fee, feeInput, onFeeChange, onFeeBlur, isSubmitting }: FeeInputProps) {
  const { t } = useThemeClasses()

  return (
    <div>
      <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Transaction Fee (XCH)</label>
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
        onChange={(e) => onFeeChange(e.target.value)}
        onBlur={onFeeBlur}
        placeholder={getAmountPlaceholder('xch')}
        className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl`}
        disabled={isSubmitting}
      />
      <p className={`mt-1 text-xs ${t.textSecondary}`}>
        Fee can be 0 for free transactions (minimum: {formatXchAmount(getMinimumFeeInXch())} XCH)
      </p>
    </div>
  )
}
