'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { UserCircle, Palette, Shield, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileTabs, type TabId } from './components/ProfileTabs'
import { ProfileTabContent } from './components/ProfileTabContent'

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('profile')
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

  return (
    <div className="w-full relative z-10">
      <ProfileHeader isDark={isDark} t={t} />
      <ProfileTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        t={t}
      />
      <ProfileTabContent
        activeTab={activeTab}
        isDark={isDark}
        t={t}
        onThemeChange={setTheme}
      />
    </div>
  )
}
