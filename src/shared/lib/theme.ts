/**
 * Theme configuration for macOS-style glass morphism design with icy blue/green tones
 */
export const theme = {
  dark: {
    bg: 'bg-black',
    gradientBg: 'from-slate-900/20 via-transparent to-cyan-950/20',
    card: 'bg-white/5',
    cardHover: 'hover:bg-white/[0.07]',
    border: 'border-white/10',
    text: 'text-white',
    textHover: 'hover:text-white',
    textSecondary: 'text-slate-400',
    textTertiary: 'text-slate-500',
    sidebar: 'bg-white/5',
    sidebarBorder: 'border-white/10',
    input: 'bg-white/5 border-white/10',
    accent: 'from-cyan-500 to-blue-500',
    accentLight: 'from-cyan-400 to-blue-400',
    accentHover: 'hover:from-cyan-500/20 hover:to-blue-500/20',
    focusRing: 'focus:ring-cyan-500/50',
  },
  light: {
    bg: 'bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300',
    gradientBg: 'from-slate-400/20 via-cyan-500/10 to-blue-500/10',
    card: 'bg-white/40',
    cardHover: 'hover:bg-white/50',
    border: 'border-white/60',
    text: 'text-slate-800',
    textHover: 'hover:text-slate-800',
    textSecondary: 'text-slate-600',
    textTertiary: 'text-slate-500',
    sidebar: 'bg-white/30',
    sidebarBorder: 'border-white/40',
    input: 'bg-white/50 border-white/40',
    accent: 'from-cyan-600 to-blue-600',
    accentLight: 'from-cyan-500 to-blue-500',
    accentHover: 'hover:from-cyan-600/20 hover:to-blue-600/20',
    focusRing: 'focus:ring-cyan-600/50',
  },
}

export function getThemeClasses(isDark: boolean) {
  return isDark ? theme.dark : theme.light
}
