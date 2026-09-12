"use client";

import { Button as ShadcnButton } from "@/shared/ui/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeClasses } from "@/shared/hooks";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "info";
  disabled?: boolean;
  icon?: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

/**
 * App button — wraps shadcn's Button with the project's glass-morphism variant
 * system. Preserves the existing public prop interface so call sites don't need
 * to change.
 *
 * Variants: primary | secondary | danger | success | warning | info
 * Sizes:    sm | md | lg
 */
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  disabled = false,
  icon: Icon,
  className = "",
  size = "md",
  fullWidth = false,
}: ButtonProps) {
  const { isDark } = useThemeClasses();

  // `tap-target` (globals.css) enforces the 44px touch minimum under a coarse pointer
  // only, so desktop keeps its compact density.
  const sizeClasses = {
    sm: "tap-target h-auto px-2 py-1 text-xs gap-1",
    md: "tap-target h-auto px-3 py-1.5 text-xs gap-1.5",
    lg: "tap-target h-auto px-4 py-2 text-sm gap-2",
  };

  const variantClasses =
    variant === "primary"
      ? isDark
        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 disabled:hover:from-cyan-500/20 disabled:hover:to-blue-500/20"
        : "bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40 disabled:hover:from-cyan-600/30 disabled:hover:to-blue-600/30"
      : variant === "danger"
        ? isDark
          ? "bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:hover:bg-red-600/20"
          : "bg-red-600/30 border border-red-600/40 text-red-700 hover:bg-red-600/40 disabled:hover:bg-red-600/30"
        : variant === "success"
          ? isDark
            ? "bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 disabled:hover:bg-green-600/20"
            : "bg-green-600/30 border border-green-600/40 text-green-700 hover:bg-green-600/40 disabled:hover:bg-green-600/30"
          : variant === "warning"
            ? isDark
              ? "bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 disabled:hover:bg-orange-600/20"
              : "bg-orange-600/30 border border-orange-600/40 text-orange-700 hover:bg-orange-600/40 disabled:hover:bg-orange-600/30"
            : variant === "info"
              ? isDark
                ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 disabled:hover:bg-blue-600/20"
                : "bg-blue-600/30 border border-blue-600/40 text-blue-700 hover:bg-blue-600/40 disabled:hover:bg-blue-600/30"
              : isDark
                ? "bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:hover:bg-white/5"
                : "bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50 disabled:hover:bg-white/40";

  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  return (
    <ShadcnButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      // Override all shadcn size defaults — we apply our own sizing
      size="sm"
      className={cn(
        "rounded-lg backdrop-blur-xl font-medium",
        sizeClasses[size],
        variantClasses,
        fullWidth && "w-full",
        className
      )}
    >
      {Icon ? <Icon size={iconSize} strokeWidth={2.5} /> : null}
      {children}
    </ShadcnButton>
  );
}
