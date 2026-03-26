import { AppLink } from "@/shared/ui";
import type { ThemeClasses } from "@/shared/lib/theme";

interface SidebarMenuProps {
  menuItems: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    path: string;
  }>;
  activeItem: string;
  sidebarCollapsed: boolean;
  t: ThemeClasses;
  onCloseSidebar?: () => void;
}

export function SidebarMenu({
  menuItems,
  activeItem,
  sidebarCollapsed,
  t,
  onCloseSidebar,
}: SidebarMenuProps) {
  return (
    <nav
      className={`flex-1 space-y-2 lg:space-y-2.5 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-modern mobile-landscape-scrollable p-2 lg:px-3 lg:py-4 ${
        sidebarCollapsed ? "lg:px-2.5 lg:py-4" : "lg:px-4 lg:py-4"
      }`}
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.id;
        return (
          <AppLink
            key={item.id}
            href={item.path}
            onClick={onCloseSidebar}
            scroll={false}
            className={`flex items-center justify-center w-14 h-14 lg:w-9 lg:h-9 mx-auto rounded-full lg:rounded-full ${
              sidebarCollapsed
                ? "lg:w-9 lg:h-9 lg:rounded-full"
                : "lg:w-full lg:h-auto lg:justify-start lg:px-3 lg:py-2 lg:gap-2.5 lg:rounded-full"
            } transition-all duration-200 group relative overflow-hidden touch-manipulation ${
              isActive ? `${t.text}` : `${t.textSecondary} ${t.cardHover}`
            }`}
            title={item.label}
          >
            {/* Glass highlight background for active item - round */}
            {isActive && (
              <>
                <div className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-full border border-white/10" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-full" />
              </>
            )}
            <Icon
              className={`w-7 h-7 lg:w-4 lg:h-4 flex-shrink-0 relative transition-all duration-200 ${
                isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
              }`}
            />
            {!sidebarCollapsed && (
              <span className="hidden lg:inline relative font-normal text-sm transition-all duration-300 whitespace-nowrap">
                {item.label}
              </span>
            )}
          </AppLink>
        );
      })}
    </nav>
  );
}
