import { useRouter } from 'next/navigation'
import type { ThemeClasses } from '@/shared/lib/theme'
import PenguinLogo from '../../PenguinLogo'
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
  isDark,
}: SidebarProps) {
  const router = useRouter()

  return (
    <aside
      className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-[100] ${
        sidebarCollapsed ? 'lg:w-12' : 'lg:w-56'
      } w-16 transition-all duration-300 ease-in-out backdrop-blur-3xl ${t.sidebar} flex flex-col overflow-hidden flex-shrink-0 mobile-landscape-sidebar`}
    >
      {/* Logo - Fixed at top */}
      <div
        className={`h-12 flex-shrink-0 flex items-center border-b ${t.border} transition-all duration-300 ${
          sidebarCollapsed
            ? 'lg:justify-center lg:px-0'
            : 'justify-center lg:justify-start px-2 lg:px-3'
        }`}
      >
        {sidebarCollapsed ? (
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 lg:w-9 lg:h-9 rounded-full overflow-hidden flex items-center justify-center">
              <PenguinLogo size={32} className={`${t.text} rounded-full lg:!w-7 lg:!h-7`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center lg:items-center gap-2.5">
            <div className="w-12 h-12 lg:w-10 lg:h-10 rounded-full overflow-hidden flex items-center justify-center">
              <PenguinLogo size={32} className={`${t.text} rounded-full lg:!w-7 lg:!h-7`} />
            </div>
            <span className="hidden lg:inline font-semibold text-lg lg:text-base transition-all duration-300 whitespace-nowrap">
              Pengui
            </span>
          </div>
        )}
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
