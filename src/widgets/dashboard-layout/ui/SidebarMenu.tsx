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
      className={`flex-1 space-y-0.5 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-modern mobile-landscape-scrollable ${
        sidebarCollapsed ? 'lg:p-1.5' : 'p-1 lg:p-2'
      }`}
    >
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeItem === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigation(item.path)}
            className={`flex items-center ${
              sidebarCollapsed
                ? 'lg:w-8 lg:h-8 lg:mx-auto lg:justify-center lg:items-center lg:px-0 lg:py-0 lg:gap-0'
                : 'w-full justify-center lg:justify-start lg:px-3'
            } px-0 py-3 lg:py-2 lg:gap-2.5 ${
              sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
            } transition-all duration-200 group relative overflow-hidden ${
              isActive ? `${t.text}` : `${t.textSecondary} ${t.cardHover}`
            }`}
            title={item.label}
          >
            {/* Glass highlight background for active item */}
            {isActive && (
              <>
                <div
                  className={`absolute inset-0 backdrop-blur-xl bg-white/10 ${
                    sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
                  } border border-white/10`}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-b from-white/5 to-transparent ${
                    sidebarCollapsed ? 'lg:rounded-full' : 'rounded-lg'
                  }`}
                />
              </>
            )}
            <Icon
              className={`w-6 h-6 lg:w-3.5 lg:h-3.5 flex-shrink-0 transition-all duration-200 ${
                sidebarCollapsed
                  ? 'lg:absolute lg:inset-0 lg:m-auto'
                  : 'relative mx-auto lg:mx-0'
              } ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
            />
            {!sidebarCollapsed && (
              <span className="hidden lg:inline relative font-normal text-sm lg:text-xs transition-all duration-300 whitespace-nowrap">
                {item.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
