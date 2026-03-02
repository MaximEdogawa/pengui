'use client'

import { useThemeClasses } from '@/shared/hooks'
import { Search } from 'lucide-react'
import type { AssetFilterCategory } from '../hooks/useAssetFilter'

interface WalletFilterBarProps {
  category: AssetFilterCategory
  onCategoryChange: (category: AssetFilterCategory) => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

const CATEGORIES: { value: AssetFilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'investments', label: 'Investments' },
]

export default function WalletFilterBar({
  category,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: WalletFilterBarProps) {
  const { isDark, t } = useThemeClasses()

  return (
    <div
      className={`sticky top-0 z-10 flex flex-col gap-2 py-2 -mx-3 px-3 ${
        isDark ? 'bg-black/40' : 'bg-white/50'
      } backdrop-blur-sm border-b ${t.border ?? 'border-transparent'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.value
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onCategoryChange(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
                    : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                  : isDark
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textSecondary}`}
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search by name or ticker..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border bg-transparent ${t.text} ${t.border} placeholder:${t.textSecondary} focus:outline-none focus:ring-2 focus:ring-cyan-500/30`}
          aria-label="Search assets"
        />
      </div>
    </div>
  )
}
