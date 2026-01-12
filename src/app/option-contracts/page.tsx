'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { FileCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function OptionContractsPage() {
  const [mounted, setMounted] = useState(false)
  const { theme: currentTheme, systemTheme } = useTheme()

  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="w-full relative z-10">
      {/* Header */}
      <div
        className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
          >
            <FileCheck
              className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              size={18}
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>
              Option Contracts
            </h1>
            <p className={`${t.textSecondary} text-xs font-medium`}>
              Option contracts functionality coming soon...
            </p>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-xl mb-3`}
          >
            <FileCheck
              className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              size={32}
              strokeWidth={1.5}
            />
          </div>
          <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
            Option contracts features will be available here soon. Check back later for updates.
          </p>
        </div>
      </div>
    </div>
  )
}
