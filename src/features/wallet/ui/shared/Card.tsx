'use client'

import { useThemeClasses } from '@/shared/hooks'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  const { isDark, t } = useThemeClasses()

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      } ${className}`}
    >
      {children}
    </div>
  )
}
