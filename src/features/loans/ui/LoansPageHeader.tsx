'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { FileText } from 'lucide-react'
import { useTheme } from 'next-themes'

interface LoansPageHeaderProps {
  isLender: boolean
  onToggleRole: () => void
}

export default function LoansPageHeader({ isLender, onToggleRole }: LoansPageHeaderProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 flex-shrink-0 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
      style={{ minHeight: '80px' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
          >
            <FileText
              className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              size={18}
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>
              Loan Marketplace
            </h1>
            <p className={`${t.textSecondary} text-xs font-medium`}>
              Create and take loan offerings
            </p>
          </div>
        </div>
        {/* Role Toggle */}
        <div className="flex items-center gap-2">
          <span className={`${t.textSecondary} text-xs`}>Borrower</span>
          <button
            onClick={onToggleRole}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isLender
                ? isDark
                  ? 'bg-cyan-500/30'
                  : 'bg-cyan-600'
                : isDark
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isLender ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`${t.textSecondary} text-xs`}>Lender</span>
        </div>
      </div>
    </div>
  )
}
