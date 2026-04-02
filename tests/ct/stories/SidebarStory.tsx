/**
 * Sidebar story — imported by sidebar.ct.spec.tsx.
 *
 * Playwright CT requires mountable components to live outside the test file.
 */
import { SidebarProvider } from "@/shared/ui/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/ui/components/DashboardSidebar";
import { getThemeClasses } from "@/shared/lib/theme";
import { WithTheme } from "../fixtures/with-theme";

const DARK_THEME = getThemeClasses(true);
const LIGHT_THEME = getThemeClasses(false);

export interface SidebarStoryProps {
  activeItem?: string;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export function SidebarStory({
  activeItem = "dashboard",
  isDark = false,
  onToggleTheme = () => {},
}: SidebarStoryProps) {
  const t = isDark ? DARK_THEME : LIGHT_THEME;
  return (
    <WithTheme theme={isDark ? "dark" : "light"}>
      <SidebarProvider defaultOpen style={{ height: "100vh" }}>
        <DashboardSidebar
          activeItem={activeItem}
          t={t}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
        />
      </SidebarProvider>
    </WithTheme>
  );
}
