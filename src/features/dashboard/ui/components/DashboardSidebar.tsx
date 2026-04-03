"use client";

import { useEffect } from "react";
import Link from "next/link";
import Moon from "lucide-react/dist/esm/icons/moon";
import Sun from "lucide-react/dist/esm/icons/sun";
import User from "lucide-react/dist/esm/icons/user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/components/ui/tooltip";
import { PenguinLogo } from "@/shared/ui";
import { cn } from "@/lib/utils";
import type { ThemeClasses } from "@/shared/lib/theme";
import { useSidebarStore } from "../../store/useSidebarStore";
import { useMenuItems } from "../../hooks/use-menu-items";

interface DashboardSidebarProps {
  /** Active nav item id */
  activeItem: string;
  t: ThemeClasses;
  isDark: boolean;
  onToggleTheme: () => void;
}

/**
 * Syncs shadcn's mobile-open state back to the Zustand sidebar store.
 * Must render inside SidebarProvider context.
 */
function SidebarStoreSync() {
  const { openMobile, isMobile } = useSidebar();
  const { closeMobile, openMobile: openMobileFromStore } = useSidebarStore();

  // Sync mobile state to Zustand store
  useEffect(() => {
    if (isMobile) {
      if (openMobile) {
        openMobileFromStore();
      } else {
        closeMobile();
      }
    }
  }, [isMobile, openMobile, closeMobile, openMobileFromStore]);

  return null;
}

/**
 * DashboardSidebar — composed shadcn sidebar for the main app shell.
 *
 * Desktop: toggles between full-width (16 rem) and icon-rail (3 rem) via the
 * logo button or the drag rail. State persisted in the `sidebar_state` cookie.
 *
 * Mobile: slides in as a Sheet overlay on top of the content. Toggled by the
 * `SidebarTrigger` in the Header.
 *
 * Glass morphism theme is applied by overriding the `[data-sidebar=sidebar]`
 * inner element; the outer layout divs remain transparent so the page gradient
 * shows through.
 *
 * @example
 * // Must be inside SidebarProvider
 * <DashboardSidebar activeItem="trading" t={t} isDark={isDark} onToggleTheme={fn} />
 */
export function DashboardSidebar({ activeItem, t, isDark, onToggleTheme }: DashboardSidebarProps) {
  const { state, toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const menuItems = useMenuItems();

  // Glass morphism bg applied on the inner sidebar panel
  const glassBg = isDark ? "bg-white/5 backdrop-blur-3xl" : "bg-white/30 backdrop-blur-3xl";

  // Border only on desktop, not mobile
  const borderClasses = isMobile
    ? ""
    : isDark
      ? "border-r border-black/20"
      : "border-r border-white/40";

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        // Strip the default border/bg on outer wrapper — glass goes on the inner panel
        "border-none bg-transparent z-[100]",
        // Apply glass to the actual sidebar panel element
        `[&_[data-sidebar=sidebar]]:${glassBg}`,
        `[&_[data-sidebar=sidebar]]:backdrop-blur-3xl`,
        `[&_[data-sidebar=sidebar]]:${borderClasses}`
      )}
    >
      <SidebarStoreSync />

      {/* ── Header: logo / collapse toggle ── */}
      <SidebarHeader className={cn("px-0 py-2 border-b", t.border)}>
        <SidebarMenuButton
          size="default"
          tooltip={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "h-8 rounded-none px-3 gap-0 transition-all duration-200",
            "data-[state=open]:bg-sidebar-accent",
            isDark
              ? "hover:bg-white/[0.06] active:bg-white/10"
              : "hover:bg-black/[0.04] active:bg-black/8"
          )}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {/* Logo mark — always visible */}
          <div className="size-7 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center">
            <PenguinLogo size={32} className={cn(t.text, "rounded-full")} />
          </div>

          {/* App name — hidden when collapsed via shadcn group utility */}
          <span
            className={cn(
              "font-semibold text-sm whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
              t.text,
              isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs"
            )}
          >
            Pengui
          </span>
        </SidebarMenuButton>
      </SidebarHeader>

      {/* ── Nav items ── */}
      <SidebarContent className="py-3 gap-0 scrollbar-modern">
        <SidebarMenu className="px-2 gap-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    // Base: rounded pill, smooth transitions
                    "relative rounded-full px-3 py-2 touch-manipulation",
                    "transition-all duration-150 ease-out",
                    "group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-3",
                    isActive
                      ? [
                          // Active: glass highlight + accent text
                          "backdrop-blur-xl border border-white/15",
                          isDark
                            ? "bg-white/10 text-white hover:bg-white/[0.13]"
                            : "bg-white/50 text-slate-800 hover:bg-white/60",
                        ]
                      : [
                          // Inactive: subtle hover only
                          t.textSecondary,
                          isDark
                            ? "hover:bg-white/[0.06] hover:text-white"
                            : "hover:bg-black/[0.04] hover:text-slate-800",
                        ]
                  )}
                >
                  <Link
                    href={item.path}
                    onClick={() => setOpenMobile(false)}
                    scroll={false}
                    prefetch
                  >
                    <Icon
                      className={cn(
                        "size-4 flex-shrink-0 transition-transform duration-150",
                        isActive ? "scale-110" : "group-hover/menu-button:scale-105"
                      )}
                    />
                    <span className="text-sm font-normal">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: profile + theme ── */}
      <SidebarFooter className={cn("border-t p-2 gap-0.5", t.border)}>
        <SidebarMenu>
          {/* Profile */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              className={cn(
                "rounded-full px-3 py-2 transition-all duration-150 touch-manipulation",
                isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]"
              )}
            >
              <Link href="/profile" onClick={() => setOpenMobile(false)} scroll={false}>
                <div
                  className={cn(
                    "size-5 rounded-md bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm",
                    t.accent
                  )}
                >
                  <User className="size-3 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-xs font-normal leading-none truncate", t.text)}>
                    User
                  </span>
                  <span className={cn("text-[10px] leading-none mt-0.5 truncate", t.textSecondary)}>
                    Premium
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Theme toggle */}
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "rounded-full px-3 py-2 transition-all duration-150 touch-manipulation",
                    isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTheme();
                  }}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <span className="relative size-4 flex-shrink-0">
                    {/* Sun — shown in dark mode */}
                    <Sun
                      className={cn(
                        "absolute inset-0 size-4 text-amber-400 transition-all duration-300",
                        isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
                      )}
                      strokeWidth={2}
                    />
                    {/* Moon — shown in light mode */}
                    <Moon
                      className={cn(
                        "absolute inset-0 size-4 text-slate-500 transition-all duration-300",
                        isDark ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                      )}
                      strokeWidth={2}
                    />
                  </span>
                  <span className={cn("text-xs", t.textSecondary)}>
                    {isDark ? "Light mode" : "Dark mode"}
                  </span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isDark ? "Switch to light mode" : "Switch to dark mode"}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
