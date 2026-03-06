'use client'

import { useThemeClasses } from '@/shared/hooks'
import { Search } from 'lucide-react'

interface WalletFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export default function WalletFilterBar({
  searchQuery,
  onSearchChange,
}: WalletFilterBarProps) {
  const { isDark, t } = useThemeClasses()

  return (
    <div
      className={`sticky top-0 z-10 py-2 -mx-3 px-3 ${
        isDark ? 'bg-black/40' : 'bg-white/50'
      } backdrop-blur-sm border-b ${t.border ?? 'border-transparent'}`}
    >
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
