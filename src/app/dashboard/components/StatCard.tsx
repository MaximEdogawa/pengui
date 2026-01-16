'use client'

import type { LucideIcon } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface StatCardProps {
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  arrowIcon?: LucideIcon
  arrowColor: string
  label: string
  value: string
  change: string
  changeColor: string
  isDark: boolean
  t: ThemeClasses
}

export function StatCard({
  icon: Icon,
  iconBgColor,
  iconColor,
  arrowIcon: ArrowIcon,
  arrowColor,
  label,
  value,
  change,
  changeColor,
  isDark,
  t,
}: StatCardProps) {
  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} ${t.cardHover} transition-all duration-200 cursor-pointer shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-xl ${iconBgColor} backdrop-blur-sm`}>
          <Icon className={iconColor} size={16} strokeWidth={2} />
        </div>
        {ArrowIcon && <ArrowIcon className={arrowColor} size={14} strokeWidth={2.5} />}
      </div>
      <p className={`${t.textTertiary} text-[10px] font-medium mb-1.5 uppercase tracking-wide`}>
        {label}
      </p>
      <p className={`${t.text} text-xl font-semibold mb-1`}>{value}</p>
      <p className={`${changeColor} text-[10px] font-medium`}>{change}</p>
    </div>
  )
}
