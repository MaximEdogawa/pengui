"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useEffect, useState } from "react";

export interface VersionDisplayProps {
  /** App version to display - if not provided, reads from package.json via env */
  version?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VersionDisplay Component
 *
 * Displays the app version number in a subtle, unobtrusive way.
 * Typically positioned in the bottom-right corner of the application.
 */
export default function VersionDisplay({
  version: versionProp,
  className = "",
}: VersionDisplayProps) {
  const { isDark } = useThemeClasses();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get version from prop or environment variable
  const version = versionProp || process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1";
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA;

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return null;

  const label = commitSha ? `v${version}+${commitSha}` : `v${version}`;

  return (
    <div
      className={`
        fixed bottom-safe-2 right-safe-3 z-10
        text-[10px] font-light tracking-wide
        ${isDark ? "text-white/20" : "text-black/20"}
        select-none pointer-events-none
        ${className}
      `}
      aria-label={`App version ${label}`}
    >
      {label}
    </div>
  );
}
