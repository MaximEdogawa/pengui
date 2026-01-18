'use client'

import type { AssetType } from '@/entities/offer'
import { useThemeClasses } from '@/shared/hooks'
import {
  assetInputAmounts,
  formatAssetAmountForInput,
  getAmountPlaceholder,
} from '@/shared/lib/utils/chia-units'

interface AmountInputProps {
  value: number | undefined
  tempInput: string | undefined
  type: AssetType
  onChange: (amount: number, tempInput?: string) => void
  onBlur: () => void
}

export default function AmountInput({
  value,
  tempInput,
  type,
  onChange,
  onBlur,
}: AmountInputProps) {
  const { t, isDark } = useThemeClasses()

  const displayValue =
    tempInput !== undefined
      ? tempInput
      : value !== undefined && value !== 0
        ? formatAssetAmountForInput(value, type)
        : ''

  // NFT uses numeric input (integers only), tokens use decimal input (floats allowed)
  const inputMode = type === 'nft' ? 'numeric' : 'decimal'
  const pattern = type === 'nft' ? '[0-9]*' : '[0-9]*\\.?[0-9]*'

  return (
    <input
      type="text"
      inputMode={inputMode}
      pattern={pattern}
      value={displayValue}
      onChange={(e) => {
        const inputValue = e.target.value
        // Validate based on asset type:
        // - NFT: only natural numbers (1, 2, 3, etc.) - no decimals
        // - Asset tokens (XCH, CAT): all float numbers allowed
        // - Never allow negative numbers
        if (assetInputAmounts.isValid(inputValue, type)) {
          // Safely convert to number
          const parsedAmount = assetInputAmounts.parse(inputValue, type)
          onChange(parsedAmount, inputValue)
        }
      }}
      onBlur={onBlur}
      placeholder={getAmountPlaceholder(type)}
      className={`w-full px-3 py-2 text-xs font-medium rounded-lg border ${t.border} ${t.bg} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        isDark
          ? 'text-white placeholder:text-gray-400'
          : 'text-slate-900 placeholder:text-slate-500'
      }`}
    />
  )
}
