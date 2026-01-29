"use client";

import { getThemeClasses } from "@/shared/lib/theme";
import { InfoBanner, VersionDisplay } from "@/shared/ui";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundGradient } from "../components/BackgroundGradient";
import { useMenuItems } from "../../hooks/use-menu-items";
import { useScrollDetection } from "../../hooks/use-scroll-detection";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

// App version from package.json (exposed via next.config.ts)
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme: currentTheme, systemTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const isDark =
    currentTheme === "dark" ||
    (currentTheme === "system" && systemTheme === "dark");
  const t = getThemeClasses(isDark);
  const isScrolling = useScrollDetection(mounted);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = useMenuItems();

  const getActiveItem = () => {
    return menuItems.find((item) => pathname === item.path)?.id || "dashboard";
  };

  const activeItem = getActiveItem();

  const handleNavigation = (path: string) => {
    if (pathname !== path) {
      router.push(path, { scroll: false });
    }
    setSidebarOpen(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`flex fixed inset-0 w-screen max-w-screen h-screen m-0 p-0 border-r-0 right-0 overflow-hidden ${t.bg} transition-colors duration-300`}
    >
      {/* Subtle static background gradient */}
      <BackgroundGradient t={t} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        t={t}
        menuItems={menuItems}
        activeItem={activeItem}
        onNavigation={handleNavigation}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => {
          if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            setSidebarCollapsed(!sidebarCollapsed);
          } else {
            setSidebarOpen(!sidebarOpen);
          }
        }}
        isDark={isDark}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full max-w-full mr-0 pr-0 border-r-0">
        {/* Top Bar */}
        <Header
          t={t}
          isDark={isDark}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Content Area */}
        <main
          key={pathname}
          className={`flex-1 overflow-y-auto overflow-x-hidden pt-1 lg:pt-2 pb-2 lg:pb-4 pl-2 lg:pl-3 pr-3 w-full max-w-full relative z-[1] min-h-0 border-r-0 scrollbar-modern ${isScrolling ? "scrollbar-visible" : ""}`}
          style={{ scrollbarGutter: "auto" }}
        >
          {/* Info Banner - inside content area */}
          <InfoBanner currentVersion={APP_VERSION} />
          <div className="w-full max-w-full h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Version Display - fixed position bottom-right */}
      <VersionDisplay version={APP_VERSION} />
    </div>
  );
}
