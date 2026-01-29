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

  // Dynamic font sizing: scale down if amount is very long
  const amountLength = displayValue.length
  let amountFontSize = 12
  if (amountLength > 15) {
    amountFontSize = Math.max(10, 12 - (amountLength - 15) * 0.15)
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      pattern={pattern}
      value={displayValue}
      onChange={(e) => {
        const inputValue = e.target.value
        if (assetInputAmounts.isValid(inputValue, type)) {
          const parsedAmount = assetInputAmounts.parse(inputValue, type)
          onChange(parsedAmount, inputValue)
        }
      }}
      onBlur={onBlur}
      placeholder={getAmountPlaceholder(type)}
      style={{
        fontSize: `${amountFontSize}px`,
      }}
      className={`w-full h-10 md:h-8 px-3 md:px-2 font-medium rounded-lg border ${t.border} ${t.bg} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-base md:text-sm text-right ${
        isDark
          ? 'text-white placeholder:text-gray-400'
          : 'text-slate-900 placeholder:text-slate-500'
      }`}
    />
  )
}
