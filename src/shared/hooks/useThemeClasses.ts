'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { useTheme } from 'next-themes'

/**
 * Hook to get theme classes and dark mode state
 * Eliminates duplication of theme detection logic across components
 */
export function useThemeClasses() {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  return { isDark, t }
}
