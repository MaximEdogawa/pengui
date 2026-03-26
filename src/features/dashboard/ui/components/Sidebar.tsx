import type { ThemeClasses } from "@/shared/lib/theme";
import { useResponsive } from "@/shared/hooks/useResponsive";
import { PenguinLogo } from "@/shared/ui";
import { SidebarMenu } from "./SidebarMenu";
import { SidebarProfile } from "./SidebarProfile";

interface SidebarProps {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  t: ThemeClasses;
  menuItems: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    path: string;
  }>;
  activeItem: string;
  onCloseSidebar?: () => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  isDark: boolean;
}

export function Sidebar({
  sidebarOpen,
  sidebarCollapsed,
  t,
  menuItems,
  activeItem,
  onCloseSidebar,
  onToggleTheme,
  onToggleSidebar,
  isDark,
}: SidebarProps) {
  const { isMobile } = useResponsive();

  return (
    <aside
      className={`${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-[100] ${
        sidebarCollapsed ? "lg:w-14" : "lg:w-56"
      } w-20 transition-all duration-300 ease-in-out backdrop-blur-3xl ${t.sidebar} flex flex-col overflow-hidden flex-shrink-0 mobile-landscape-sidebar`}
    >
      {/* Logo Button - Fixed at top, toggles sidebar; logo fills header height so border sits right below */}
      <div
        className={`h-12 lg:h-11 flex-shrink-0 flex items-center border-b ${t.border} transition-all duration-300 ${
          sidebarCollapsed ? "lg:justify-center lg:px-0" : "lg:justify-start lg:px-4"
        }`}
      >
        <button
          onClick={onToggleSidebar}
          className={`
            relative group flex items-center gap-2 rounded-lg transition-colors duration-200
            h-12 w-12 lg:h-11 lg:w-11 flex-shrink-0
            ${sidebarCollapsed ? "" : "lg:!w-auto lg:pr-4"}
            ${isDark ? "lg:hover:bg-white/5" : "lg:hover:bg-black/5"}
          `}
        >
          <div className="h-12 w-12 lg:h-11 lg:w-11 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center">
            <PenguinLogo size={isMobile ? 48 : 44} className={`${t.text} rounded-full`} />
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
        onCloseSidebar={onCloseSidebar}
      />

      {/* User Profile - Fixed at bottom */}
      <SidebarProfile
        sidebarCollapsed={sidebarCollapsed}
        t={t}
        onCloseSidebar={onCloseSidebar}
        onToggleTheme={onToggleTheme}
        isDark={isDark}
      />
    </aside>
  );
}
