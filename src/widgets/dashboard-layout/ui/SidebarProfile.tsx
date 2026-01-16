import { User, Moon, Sun } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface SidebarProfileProps {
  sidebarCollapsed: boolean
  t: ThemeClasses
  onProfileClick: () => void
  onToggleTheme: () => void
  isDark: boolean
}

export function SidebarProfile({
  sidebarCollapsed,
  t,
  onProfileClick,
  onToggleTheme,
  isDark,
}: SidebarProfileProps) {
  return (
    <div
      className={`flex-shrink-0 border-t ${t.border} transition-all duration-300 mb-4 mobile-landscape-profile ${
        sidebarCollapsed ? 'lg:p-1.5' : 'p-1 lg:p-2'
      }`}
    >
      <div
        onClick={onProfileClick}
        className={`flex items-center ${
          sidebarCollapsed
            ? 'lg:w-10 lg:h-10 lg:mx-auto lg:justify-center lg:items-center lg:px-0 lg:py-0 lg:gap-0'
            : 'justify-center lg:justify-start lg:px-2.5'
        } px-0 py-2 lg:gap-2.5 ${
          sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
        } transition-all cursor-pointer group relative overflow-hidden ${t.cardHover}`}
        title={sidebarCollapsed ? 'User' : 'Profile'}
      >
        {/* Glass effect overlay - enhanced */}
        <div
          className={`absolute inset-0 backdrop-blur-xl bg-white/10 ${
            sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
          } border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b from-white/5 to-transparent ${
            sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
          } opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
        />
        {sidebarCollapsed ? (
          <div className="flex items-center justify-center">
            <div
              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
            >
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-3 lg:gap-3 flex-1 min-w-0 relative">
            <div
              className={`w-10 h-10 lg:w-6 lg:h-6 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center flex-shrink-0 shadow-md backdrop-blur-xl`}
            >
              <User className="w-6 h-6 lg:w-3.5 lg:h-3.5 text-white" />
            </div>
            <div className="hidden lg:block transition-all duration-300 whitespace-nowrap">
              <p className={`text-sm lg:text-xs font-normal ${t.text}`}>User</p>
              <p className={`text-xs lg:text-[10px] ${t.textSecondary}`}>Premium</p>
            </div>
            {/* Theme Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleTheme()
              }}
              className={`relative inline-flex h-5 w-9 lg:h-4 lg:w-7 items-center rounded-full backdrop-blur-3xl transition-all duration-300 focus:outline-none focus:ring-2 ${t.focusRing} overflow-hidden flex-shrink-0 ml-2 lg:ml-3 ${
                isDark
                  ? 'bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 shadow-lg shadow-amber-500/20'
                  : 'bg-gradient-to-r from-white/20 via-white/30 to-white/20 border border-white/30 shadow-lg shadow-slate-900/20'
              }`}
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              aria-label="Toggle theme"
            >
              {/* Glass reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-full pointer-events-none" />
              <span
                className={`relative inline-block h-3 w-3 lg:h-2.5 lg:w-2.5 transform rounded-full backdrop-blur-3xl transition-all duration-300 shadow-lg ${
                  isDark
                    ? 'translate-x-[20px] lg:translate-x-[16px] bg-gradient-to-br from-white/30 via-white/20 to-white/10 border border-white/40'
                    : 'translate-x-0.5 bg-gradient-to-br from-white/50 via-white/40 to-white/30 border border-white/60'
                } flex items-center justify-center`}
              >
                {/* Inner glass highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full opacity-60" />
                {isDark ? (
                  <Sun
                    className="relative h-2.5 w-2.5 lg:h-2 lg:w-2 text-amber-300 drop-shadow-sm"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Moon
                    className="relative h-2.5 w-2.5 lg:h-2 lg:w-2 text-slate-700 drop-shadow-sm"
                    strokeWidth={2.5}
                  />
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
