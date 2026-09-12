"use client";

import dynamic from "next/dynamic";
import { useWalletConnectionHealthCheck } from "@/features/wallet/hooks/useWalletConnectionHealthCheck";
import { getThemeClasses } from "@/shared/lib/theme";
import { InfoBanner, VersionDisplay } from "@/shared/ui";
import { SidebarProvider } from "@/shared/ui/components/ui/sidebar";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundGradient } from "../components/BackgroundGradient";
import { useMenuItems } from "../../hooks/use-menu-items";
import { useScrollDetection } from "../../hooks/use-scroll-detection";
import { Header } from "../components/Header";
import { useSidebarStore } from "../../store/useSidebarStore";

// App version from package.json (exposed via next.config.ts)
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1";

// Lazy-load the sidebar content — not needed for the initial LCP frame
const DashboardSidebar = dynamic(
  () => import("../components/DashboardSidebar").then((m) => m.DashboardSidebar),
  { ssr: false }
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout shell — rendered inside SidebarProvider so that Header and
 * DashboardSidebar can access useSidebar() for toggle actions.
 */
function LayoutInner({ children }: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const { theme: currentTheme, systemTheme, setTheme } = useTheme();
  const pathname = usePathname();

  // Detect when wallet (e.g. Sage) is closed or session invalid; redirects to login
  useWalletConnectionHealthCheck();

  const isDark = currentTheme === "dark" || (currentTheme === "system" && systemTheme === "dark");
  const t = getThemeClasses(isDark);
  const isScrolling = useScrollDetection(mounted);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = useMenuItems();
  const activeItem =
    menuItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.id ||
    "dashboard";

  if (!mounted) {
    return (
      <div className={`flex fixed inset-0 items-center justify-center m-0 p-0 ${t.bg}`}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className={`flex fixed inset-0 m-0 p-0 overflow-hidden ${t.bg} transition-colors duration-300`}
    >
      {/* Subtle static background gradient */}
      <BackgroundGradient t={t} />

      {/* Sidebar — lazy loaded, client-only, inside SidebarProvider context */}
      <DashboardSidebar activeItem={activeItem} t={t} isDark={isDark} onToggleTheme={toggleTheme} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full max-w-full px-safe">
        {/* Top bar — mobile trigger is handled internally by SidebarTrigger */}
        <Header t={t} isDark={isDark} />

        {/* Content Area */}
        <main
          key={pathname}
          className={`flex-1 overflow-y-auto pt-1 lg:pt-2 pb-1.5 sm:pb-2 lg:pb-4 pl-1.5 sm:pl-2 lg:pl-3 pr-1.5 sm:pr-3 w-full max-w-full relative z-[1] min-h-0 border-r-0 scrollbar-modern ${isScrolling ? "scrollbar-visible" : ""}`}
          style={{ scrollbarGutter: "auto" }}
        >
          <InfoBanner currentVersion={APP_VERSION} />
          <div className="w-full max-w-full h-full flex flex-col pb-safe">{children}</div>
        </main>
      </div>

      {/* Version Display - fixed position bottom-right */}
      <VersionDisplay version={APP_VERSION} />
    </div>
  );
}

/**
 * DashboardLayout — the root app shell.
 *
 * Renders `SidebarProvider` as the context root so descendants can call
 * `useSidebar()` for toggle and state access. Desktop collapsed state is
 * seeded from the Zustand store (which persists across sessions via the
 * `sidebar_state` cookie that shadcn writes on every toggle).
 *
 * @example
 * // In app/dashboard/layout.tsx
 * export default function Layout({ children }) {
 *   return <DashboardLayout>{children}</DashboardLayout>
 * }
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { desktopCollapsed } = useSidebarStore();

  return (
    <SidebarProvider
      defaultOpen={!desktopCollapsed}
      // Override shadcn's full-viewport flex layout; our inner LayoutInner is
      // fixed-positioned so the provider div is just a context wrapper here
      className="block min-h-0"
    >
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
