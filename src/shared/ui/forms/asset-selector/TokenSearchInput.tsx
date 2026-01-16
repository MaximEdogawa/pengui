'use client'

import { useThemeClasses } from '@/shared/hooks'
import TokenDropdown from './TokenDropdown'

interface Token {
  assetId: string
  ticker: string
  symbol?: string
  name?: string
}

interface TokenSearchInputProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  placeholder: string
  disabled: boolean
  filteredTokens: Token[]
  onSelectToken: (token: Token) => void
  isDropdownOpen: boolean
  onCloseDropdown: () => void
}

export default function TokenSearchInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  disabled,
  filteredTokens,
  onSelectToken,
  isDropdownOpen,
  onCloseDropdown,
}: TokenSearchInputProps) {
  const { t, isDark } = useThemeClasses()

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting the form or removing the asset
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-xs font-medium rounded-lg border ${t.border} ${t.bg} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
          isDark
            ? 'text-white placeholder:text-gray-400'
            : 'text-slate-900 placeholder:text-slate-500'
        }`}
        disabled={disabled}
      />
      <TokenDropdown
        tokens={filteredTokens}
        isOpen={isDropdownOpen}
        onSelect={onSelectToken}
        onClose={onCloseDropdown}
        searchValue={value}
      />
    </div>
  )
}
