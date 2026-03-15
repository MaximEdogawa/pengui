import { User, Moon, Sun } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { AppLink } from '@/shared/ui'

interface SidebarProfileProps {
  sidebarCollapsed: boolean
  t: ThemeClasses
  onCloseSidebar?: () => void
  onToggleTheme: () => void
  isDark: boolean
}

export function SidebarProfile({
  sidebarCollapsed,
  t,
  onCloseSidebar,
  onToggleTheme,
  isDark,
}: SidebarProfileProps) {
  const profileLinkClass = `${t.cardHover} flex items-center justify-center transition-all cursor-pointer group relative overflow-hidden touch-manipulation`

  return (
    <div
      className={`flex-shrink-0 border-t ${t.border} transition-all duration-300 mb-4 mobile-landscape-profile p-2 ${
        sidebarCollapsed ? 'lg:px-2.5 lg:py-4' : 'lg:px-4 lg:py-4'
      }`}
    >
      {/* Mobile: Icon only - larger for touch */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        <AppLink
          href="/profile"
          onClick={onCloseSidebar}
          scroll={false}
          className={`w-14 h-14 rounded-full flex items-center justify-center relative ${profileLinkClass}`}
          title="Profile"
        >
          <div
            className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-hidden
          />
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-sm backdrop-blur-xl relative`}
          >
            <User className="w-5 h-5 text-white" />
          </div>
        </AppLink>
        {/* Theme toggle for mobile */}
        <button
          onClick={onToggleTheme}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${t.cardHover}`}
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
        >
          {isDark ? (
            <Sun className="w-7 h-7 text-amber-400" strokeWidth={2} />
          ) : (
            <Moon className="w-7 h-7 text-slate-600" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Desktop: Full profile */}
      <AppLink
        href="/profile"
        onClick={onCloseSidebar}
        scroll={false}
        className={`hidden lg:flex items-center ${
          sidebarCollapsed
            ? 'w-9 h-9 mx-auto justify-center items-center'
            : 'justify-start px-3 gap-2.5'
        } py-2 rounded-full transition-all group relative overflow-hidden ${profileLinkClass}`}
        title={sidebarCollapsed ? 'User' : 'Profile'}
      >
        {/* Glass effect overlay - round */}
        <div
          className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        />
        {sidebarCollapsed ? (
          <div className="flex items-center justify-center relative">
            <div
              className={`w-6 h-6 rounded-md bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
            >
              <User className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-start gap-2.5 flex-1 min-w-0 relative">
            <div
              className={`w-6 h-6 rounded-md bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
            >
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="transition-all duration-300 whitespace-nowrap flex-1">
              <p className={`text-xs font-normal ${t.text}`}>User</p>
              <p className={`text-[10px] ${t.textSecondary}`}>Premium</p>
            </div>
            {/* Theme Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleTheme()
              }}
              className={`relative inline-flex h-4 w-7 items-center rounded-full backdrop-blur-3xl transition-all duration-300 focus:outline-none focus:ring-2 ${t.focusRing} overflow-hidden flex-shrink-0 ${
                isDark
                  ? 'bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 shadow-lg shadow-amber-500/20'
                  : 'bg-gradient-to-r from-white/20 via-white/30 to-white/20 border border-white/30 shadow-lg shadow-slate-900/20'
              }`}
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              aria-label="Toggle theme"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-full pointer-events-none" />
              <span
                className={`relative inline-block h-2.5 w-2.5 transform rounded-full backdrop-blur-3xl transition-all duration-300 shadow-lg ${
                  isDark
                    ? 'translate-x-[14px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 border border-white/40'
                    : 'translate-x-0.5 bg-gradient-to-br from-white/50 via-white/40 to-white/30 border border-white/60'
                } flex items-center justify-center`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full opacity-60" />
                {isDark ? (
                  <Sun className="relative h-2 w-2 text-amber-300 drop-shadow-sm" strokeWidth={2.5} />
                ) : (
                  <Moon className="relative h-2 w-2 text-slate-700 drop-shadow-sm" strokeWidth={2.5} />
                )}
              </span>
            </button>
          </div>
        )}
      </AppLink>
    </div>
  )
}
