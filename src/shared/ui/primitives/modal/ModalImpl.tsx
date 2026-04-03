"use client";

import { useThemeClasses } from "@/shared/hooks";
import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ModalImplProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  className?: string;
  closeOnOverlayClick?: boolean;
}

/**
 * ModalImpl — the actual Dialog implementation.
 *
 * Loaded lazily via Modal.tsx so this chunk is only fetched when a modal
 * is first shown. Uses shadcn's Dialog (Radix UI) under the hood with
 * the project's glass-morphism styling.
 *
 * Not used directly — import Modal instead.
 */
export default function ModalImpl({
  children,
  onClose,
  maxWidth = "max-w-5xl",
  className = "",
  closeOnOverlayClick = true,
}: ModalImplProps) {
  const { isDark } = useThemeClasses();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // Hide the default close button — consumers provide their own close UI
        className={cn(
          "[&>button:last-child]:hidden",
          "backdrop-blur-[40px] rounded-lg shadow-xl p-0 border",
          maxWidth,
          "w-full max-h-[90vh] sm:max-h-[85vh] my-auto overflow-y-auto transition-all duration-300",
          isDark ? "bg-white/10 border-white/20" : "bg-white/60 border-white/70",
          className
        )}
        onInteractOutside={(e) => {
          if (!closeOnOverlayClick) e.preventDefault();
        }}
        aria-describedby={undefined}
        // Override the default z-index in the portal to match our app's z-stack
        style={{ zIndex: 60 }}
      >
        <DialogTitle className="sr-only">App dialog</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
