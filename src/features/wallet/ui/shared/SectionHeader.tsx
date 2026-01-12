'use client'

import { useThemeClasses } from '@/shared/hooks'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  iconSize?: number
}

export default function SectionHeader({ icon: Icon, title, iconSize = 16 }: SectionHeaderProps) {
  const { isDark, t } = useThemeClasses()

  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`p-1.5 rounded-lg ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
      >
        <Icon className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} size={iconSize} />
      </div>
      <h3 className={`${t.text} text-sm font-semibold`}>{title}</h3>
    </div>
  )
}
