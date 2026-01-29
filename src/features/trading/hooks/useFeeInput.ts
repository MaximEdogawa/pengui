import { useCallback, useState } from 'react'
import {
  assetInputAmounts,
  formatAssetAmountForInput,
  getAmountPlaceholder,
  getMinimumFeeInXch,
} from '@/shared/lib/utils/chia-units'

/**
 * Extract fee input logic to reduce complexity
 */
export function useFeeInput() {
  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  const handleFeeChange = useCallback((value: string) => {
    setFeeInput(value)
    const parsed = assetInputAmounts.parse(value, 'xch')
    setFee(parsed)
  }, [])

  const handleFeeBlur = useCallback(() => {
    const parsed = assetInputAmounts.parse(
      feeInput !== undefined ? feeInput : fee?.toString() || '',
      'xch'
    )
    setFee(parsed >= 0 ? parsed : getMinimumFeeInXch())
    setFeeInput(undefined)
  }, [feeInput, fee])

  const feeDisplayValue =
    feeInput !== undefined
      ? feeInput
      : fee && fee > 0
        ? formatAssetAmountForInput(fee, 'xch')
        : ''

  return {
    fee,
    setFee,
    feeInput,
    feeDisplayValue,
    handleFeeChange,
    handleFeeBlur,
    feePlaceholder: getAmountPlaceholder('xch'),
  }
}
