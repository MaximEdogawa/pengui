import { useRouter } from 'next/navigation'
import type { ThemeClasses } from '@/shared/lib/theme'
import { PenguinLogo } from '@/shared/ui'
import { SidebarMenu } from './SidebarMenu'
import { SidebarProfile } from './SidebarProfile'

interface SidebarProps {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  t: ThemeClasses
  menuItems: Array<{ id: string; icon: React.ComponentType<{ className?: string; size?: number }>; label: string; path: string }>
  activeItem: string
  onNavigation: (path: string) => void
  onToggleTheme: () => void
  onToggleSidebar: () => void
  isDark: boolean
}

export function Sidebar({
  sidebarOpen,
  sidebarCollapsed,
  t,
  menuItems,
  activeItem,
  onNavigation,
  onToggleTheme,
  onToggleSidebar,
  isDark,
}: SidebarProps) {
  const router = useRouter()

  return (
    <aside
      className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-[100] ${
        sidebarCollapsed ? 'lg:w-12' : 'lg:w-56'
      } w-12 transition-all duration-300 ease-in-out backdrop-blur-3xl ${t.sidebar} flex flex-col overflow-hidden flex-shrink-0 mobile-landscape-sidebar`}
    >
      {/* Logo Button - Fixed at top, toggles sidebar */}
      <div
        className={`h-10 flex-shrink-0 flex items-center justify-center border-b ${t.border} transition-all duration-300 ${
          sidebarCollapsed ? '' : 'lg:justify-start lg:px-3'
        }`}
      >
        <button
          onClick={onToggleSidebar}
          className={`
            relative group flex items-center gap-2 rounded-lg transition-colors duration-200
            p-1
            ${sidebarCollapsed ? '' : 'lg:pr-3'}
            ${isDark ? 'lg:hover:bg-white/5' : 'lg:hover:bg-black/5'}
          `}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
            <PenguinLogo size={28} className={`${t.text} rounded-full`} />
          </div>
          
          {/* Text - only on desktop when expanded */}
          {!sidebarCollapsed && (
            <span className={`hidden lg:inline font-semibold text-sm whitespace-nowrap ${t.text}`}>
              Pengui
            </span>
          )}
        </button>
      </div>

      {/* Menu Items - Scrollable on mobile landscape */}
      <SidebarMenu
        menuItems={menuItems}
        activeItem={activeItem}
        sidebarCollapsed={sidebarCollapsed}
        t={t}
        onNavigation={onNavigation}
      />

      {/* User Profile - Fixed at bottom */}
      <SidebarProfile
        sidebarCollapsed={sidebarCollapsed}
        t={t}
        onProfileClick={() => {
          router.push('/profile')
          onNavigation('/profile')
        }}
        onToggleTheme={onToggleTheme}
        isDark={isDark}
      />
    </aside>
  )
}
