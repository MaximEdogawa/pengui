'use client'

import { UserCircle } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface ProfileHeaderProps {
  isDark: boolean
  t: ThemeClasses
}

export function ProfileHeader({ isDark, t }: ProfileHeaderProps) {
  return (
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
  )
}
