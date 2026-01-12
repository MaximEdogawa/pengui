'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

interface Tab {
  label: string
  value: string
  icon: LucideIcon
}

interface LoansTabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function LoansTabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: LoansTabNavigationProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-xl p-1 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 flex-shrink-0 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
      style={{ minHeight: '40px' }}
    >
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200 font-medium text-[11px] relative overflow-hidden ${
                isActive
                  ? isDark
                    ? 'bg-white/10 text-white backdrop-blur-xl'
                    : 'bg-white/50 text-slate-800 backdrop-blur-xl'
                  : `${t.textSecondary} ${t.cardHover}`
              }`}
            >
              {isActive && (
                <>
                  <div
                    className={`absolute inset-0 backdrop-blur-xl ${
                      isDark ? 'bg-white/10' : 'bg-white/30'
                    } rounded-lg`}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${
                      isDark ? 'from-white/5' : 'from-white/20'
                    } to-transparent rounded-lg`}
                  />
                </>
              )}
              <Icon
                size={12}
                strokeWidth={2.5}
                className={`relative ${isActive ? 'opacity-100' : 'opacity-70'}`}
              />
              <span className="relative">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
