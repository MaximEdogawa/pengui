"use client";

import { NetworkPicker, SafeConnectButton } from "@/shared/ui";
import { SidebarTrigger } from "@/shared/ui/components/ui/sidebar";
import { Separator } from "@/shared/ui/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ThemeClasses } from "@/shared/lib/theme";

interface HeaderProps {
  t: ThemeClasses;
  isDark: boolean;
}

/**
 * Header — fixed top bar for the dashboard layout.
 *
 * Desktop: spacer on the left (sidebar fills that space) + network/wallet on right.
 * Mobile:  SidebarTrigger hamburger on the left + network/wallet on right.
 *
 * The SidebarTrigger is backed by shadcn's useSidebar() context and opens the
 * mobile Sheet drawer automatically.
 */
export function Header({ t, isDark }: HeaderProps) {
  return (
    <header
      className={cn(
        // Layout: fixed height, full-bleed, flex row
        "h-12 flex items-center justify-between gap-2",
        "pl-1 pr-3 sm:pr-4",
        // The header is the top edge of the app, so it absorbs the notch / status bar:
        // its own background extends under them while its contents sit below.
        "box-content pt-safe",
        // Glass background + border
        "backdrop-blur-3xl border-b transition-colors duration-300",
        t.card,
        t.border,
        // z-index above sidebar overlay (sidebar is z-[100])
        "relative z-[200]"
      )}
    >
      {/* ── Left: mobile sidebar trigger ── */}
      <div className="flex items-center gap-1">
        {/* SidebarTrigger uses shadcn's PanelLeft icon + toggleSidebar() internally */}
        <SidebarTrigger
          className={cn(
            "size-9 rounded-lg transition-colors duration-150",
            isDark
              ? "text-slate-400 hover:text-white hover:bg-white/[0.06]"
              : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04]"
          )}
        />
        <Separator
          orientation="vertical"
          className={cn("h-5 mx-1 hidden md:block", isDark ? "bg-white/10" : "bg-black/10")}
        />
      </div>

      {/* ── Spacer (desktop): sidebar occupies the left column ── */}
      <div className="hidden lg:flex flex-1" aria-hidden />

      {/* ── Right: network + wallet ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <NetworkPicker />
        <SafeConnectButton />
      </div>
    </header>
  );
}
