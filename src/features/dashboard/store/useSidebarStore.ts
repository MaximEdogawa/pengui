"use client";

import { create } from "zustand";

interface SidebarState {
  /** Mobile drawer open/closed */
  mobileOpen: boolean;
  /** Desktop rail (collapsed icon-only) mode */
  desktopCollapsed: boolean;
}

interface SidebarActions {
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
  setDesktopCollapsed: (collapsed: boolean) => void;
  toggleDesktop: () => void;
}

type SidebarStore = SidebarState & SidebarActions;

/**
 * External sidebar state store.
 *
 * Primary state owner for sidebar open/collapsed is shadcn's `useSidebar` hook
 * (inside `DashboardSidebar`). This store allows code outside the sidebar tree
 * to read or drive sidebar state — e.g. keyboard shortcuts, onboarding tours.
 *
 * `desktopCollapsed` is also written to the `sidebar:state` cookie by
 * `DashboardLayout` so shadcn's `SidebarProvider` can seed the correct initial
 * width before hydration.
 */
export const useSidebarStore = create<SidebarStore>()((set) => ({
  mobileOpen: false,
  desktopCollapsed: false,

  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),

  setDesktopCollapsed: (collapsed) => set({ desktopCollapsed: collapsed }),
  toggleDesktop: () => set((s) => ({ desktopCollapsed: !s.desktopCollapsed })),
}));

// Selector hooks
export const useMobileSidebarOpen = () => useSidebarStore((s) => s.mobileOpen);
export const useDesktopCollapsed = () => useSidebarStore((s) => s.desktopCollapsed);
