'use client'

import type { LucideIcon } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

export type TabId = 'profile' | 'themes' | 'security' | 'preferences'

interface Tab {
  id: TabId
  icon: LucideIcon
  label: string
}

interface ProfileTabsProps {
  tabs: Tab[]
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isDark: boolean
  t: ThemeClasses
}

export function ProfileTabs({ tabs, activeTab, onTabChange, isDark, t }: ProfileTabsProps) {
  return (
    <div
      className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-xl p-0.5 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex flex-wrap gap-0.5 min-h-[28px] items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg transition-opacity duration-200 font-medium text-[11px] relative overflow-hidden flex-shrink-0 h-6 ${
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
                className={`relative flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`}
              />
              <span className="relative whitespace-nowrap">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
