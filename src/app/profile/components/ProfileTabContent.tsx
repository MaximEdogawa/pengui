'use client'

import { UserCircle, Palette, Shield, Settings } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import type { TabId } from './ProfileTabs'

interface ProfileTabContentProps {
  activeTab: TabId
  isDark: boolean
  t: ThemeClasses
  onThemeChange: (theme: 'light' | 'dark') => void
}

export function ProfileTabContent({
  activeTab,
  isDark,
  t,
  onThemeChange,
}: ProfileTabContentProps) {
  const availableThemes = [
    { id: 'light' as const, name: 'Light' },
    { id: 'dark' as const, name: 'Dark' },
  ]

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 min-h-[400px] ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      {activeTab === 'profile' && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Profile Information</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Manage your personal information and account details
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-xl mb-3`}
            >
              <UserCircle
                className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              Profile management coming soon...
            </p>
          </div>
        </div>
      )}

      {activeTab === 'themes' && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Theme Settings</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Customize your visual experience with different themes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableThemes.map((theme) => {
              const isCurrentTheme =
                (theme.id === 'dark' && isDark) || (theme.id === 'light' && !isDark)
              return (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    isCurrentTheme
                      ? isDark
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30'
                        : 'bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-600/40'
                      : `${t.cardHover} border ${t.border}`
                  } backdrop-blur-xl`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Palette
                      className={`${
                        isCurrentTheme
                          ? isDark
                            ? 'text-cyan-400'
                            : 'text-cyan-700'
                          : t.textSecondary
                      }`}
                      size={24}
                      strokeWidth={2}
                    />
                    {isCurrentTheme && (
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isDark ? 'bg-cyan-400' : 'bg-cyan-600'
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      isCurrentTheme ? (isDark ? 'text-cyan-400' : 'text-cyan-700') : t.text
                    }`}
                  >
                    {theme.name}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Security Settings</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Manage your account security and privacy settings
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-xl mb-3`}
            >
              <Shield
                className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              Security settings coming soon...
            </p>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>User Preferences</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Customize your application preferences and settings
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-xl mb-3`}
            >
              <Settings
                className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              User preferences coming soon...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
