'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { UserCircle, Palette, Shield, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'themes' | 'security' | 'preferences'>(
    'profile'
  )
  const { theme: currentTheme, systemTheme, setTheme } = useTheme()

  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const tabs = [
    { id: 'profile' as const, icon: UserCircle, label: 'Profile' },
    { id: 'themes' as const, icon: Palette, label: 'Themes' },
    { id: 'security' as const, icon: Shield, label: 'Security' },
    { id: 'preferences' as const, icon: Settings, label: 'Preferences' },
  ]

  const availableThemes = [
    { id: 'light' as const, name: 'Light' },
    { id: 'dark' as const, name: 'Dark' },
  ]

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
            <UserCircle
              className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              size={18}
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>
              Profile & Settings
            </h1>
            <p className={`${t.textSecondary} text-xs font-medium`}>
              Manage your account and customize your experience
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
                onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Content */}
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
                    onClick={() => setTheme(theme.id)}
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
    </div>
  )
}
