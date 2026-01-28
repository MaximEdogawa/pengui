import type { ThemeClasses } from '@/shared/lib/theme'

interface SidebarMenuProps {
  menuItems: Array<{ id: string; icon: React.ComponentType<{ className?: string; size?: number }>; label: string; path: string }>
  activeItem: string
  sidebarCollapsed: boolean
  t: ThemeClasses
  onNavigation: (path: string) => void
}

export function SidebarMenu({
  menuItems,
  activeItem,
  sidebarCollapsed,
  t,
  onNavigation,
}: SidebarMenuProps) {
  return (
    <nav
      className={`flex-1 space-y-0.5 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-modern mobile-landscape-scrollable p-1 ${
        sidebarCollapsed ? 'lg:p-1.5' : 'lg:p-2'
      }`}
    >
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeItem === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigation(item.path)}
            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-lg ${
              sidebarCollapsed
                ? 'lg:w-8 lg:h-8 lg:rounded-full'
                : 'lg:w-full lg:h-auto lg:justify-start lg:px-3 lg:py-2 lg:gap-2.5 lg:rounded-lg'
            } transition-all duration-200 group relative overflow-hidden ${
              isActive ? `${t.text}` : `${t.textSecondary} ${t.cardHover}`
            }`}
            title={item.label}
          >
            {/* Glass highlight background for active item */}
            {isActive && (
              <>
                <div
                  className={`absolute inset-0 backdrop-blur-xl bg-white/10 rounded-lg ${
                    sidebarCollapsed ? 'lg:rounded-full' : 'lg:rounded-lg'
                  } border border-white/10`}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-lg ${
                    sidebarCollapsed ? 'lg:rounded-full' : 'lg:rounded-lg'
                  }`}
                />
              </>
            )}
            <Icon
              className={`w-4 h-4 flex-shrink-0 relative transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="hidden lg:inline relative font-normal text-sm transition-all duration-300 whitespace-nowrap">
                {item.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
