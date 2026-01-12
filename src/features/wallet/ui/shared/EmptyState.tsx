'use client'

import { useThemeClasses } from '@/shared/hooks'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  iconSize?: number
}

export default function EmptyState({ icon: Icon, message, iconSize = 32 }: EmptyStateProps) {
  const { isDark, t } = useThemeClasses()

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div
        className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-xl mb-3`}
      >
        <Icon
          className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          size={iconSize}
          strokeWidth={1.5}
        />
      </div>
      <p className={`${t.textSecondary} text-center text-sm max-w-md`}>{message}</p>
    </div>
  )
}
