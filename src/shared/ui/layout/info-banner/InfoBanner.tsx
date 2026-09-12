"use client";

import { useThemeClasses } from "@/shared/hooks";
import { X, Info, AlertTriangle, Sparkles } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export type Environment = "demo" | "alpha" | "beta" | "main" | "production";

export interface BannerAnnouncement {
  id: string;
  message: string;
  type?: "info" | "warning" | "success";
}

export interface InfoBannerProps {
  /** Current environment - if not provided, reads from NEXT_PUBLIC_APP_ENV */
  environment?: Environment;
  /** Announcement to display (for production environment) */
  announcement?: BannerAnnouncement | null;
  /** App version to check for new releases (for production environment) */
  currentVersion?: string;
  /** Custom message to display in non-production environments */
  customMessage?: string;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

const STORAGE_KEY = "pengui-banner-dismissed";
const VERSION_KEY = "pengui-last-seen-version";
const ANNOUNCEMENT_KEY = "pengui-last-dismissed-announcement";

/**
 * Get the current environment from env variable or props
 */
function getEnvironment(envProp?: Environment): Environment {
  if (envProp) return envProp;

  const envVar = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase();

  if (envVar === "demo") return "demo";
  if (envVar === "alpha") return "alpha";
  if (envVar === "beta") return "beta";
  if (envVar === "production" || envVar === "main") return "main";

  // Default to main if not specified
  return "main";
}

/**
 * Check if the environment is non-production (always shows banner)
 */
function isNonProduction(env: Environment): boolean {
  return env === "demo" || env === "alpha" || env === "beta";
}

/**
 * Get environment-specific styling
 */
function getEnvironmentStyles(
  env: Environment,
  isDark: boolean
): {
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconColor: string;
  label: string;
} {
  switch (env) {
    case "demo":
      return {
        bgClass: isDark ? "bg-purple-600/20" : "bg-purple-600/30",
        borderClass: isDark ? "border-purple-500/30" : "border-purple-600/40",
        textClass: isDark ? "text-purple-300" : "text-purple-700",
        iconColor: isDark ? "text-purple-400" : "text-purple-600",
        label: "Demo Environment",
      };
    case "alpha":
      return {
        bgClass: isDark ? "bg-orange-600/20" : "bg-orange-600/30",
        borderClass: isDark ? "border-orange-500/30" : "border-orange-600/40",
        textClass: isDark ? "text-orange-300" : "text-orange-700",
        iconColor: isDark ? "text-orange-400" : "text-orange-600",
        label: "Alpha",
      };
    case "beta":
      return {
        bgClass: isDark ? "bg-yellow-600/20" : "bg-yellow-600/30",
        borderClass: isDark ? "border-yellow-500/30" : "border-yellow-600/40",
        textClass: isDark ? "text-yellow-300" : "text-yellow-700",
        iconColor: isDark ? "text-yellow-400" : "text-yellow-600",
        label: "Beta",
      };
    case "main":
    case "production":
    default:
      return {
        bgClass: isDark ? "bg-cyan-600/20" : "bg-cyan-600/30",
        borderClass: isDark ? "border-cyan-500/30" : "border-cyan-600/40",
        textClass: isDark ? "text-cyan-300" : "text-cyan-700",
        iconColor: isDark ? "text-cyan-400" : "text-cyan-600",
        label: "Production",
      };
  }
}

/**
 * Get the icon for the banner based on environment
 */
function getBannerIcon(env: Environment) {
  if (env === "alpha" || env === "beta") {
    return AlertTriangle;
  }
  if (env === "demo") {
    return Sparkles;
  }
  return Info;
}

/**
 * InfoBanner Component
 *
 * Displays environment-specific information and app announcements.
 * - Non-production (demo, alpha, beta): Always visible, non-dismissible
 * - Production (main): Dismissible, only shows when there's new info
 */
export default function InfoBanner({
  environment: envProp,
  announcement,
  currentVersion,
  customMessage,
  onDismiss,
}: InfoBannerProps) {
  const { isDark } = useThemeClasses();
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const environment = getEnvironment(envProp);
  const isNonProd = isNonProduction(environment);
  const styles = getEnvironmentStyles(environment, isDark);
  const Icon = getBannerIcon(environment);

  /**
   * Check if banner should be shown in production environment
   */
  const shouldShowInProduction = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    // Check for new version
    if (currentVersion) {
      const lastSeenVersion = localStorage.getItem(VERSION_KEY);
      if (lastSeenVersion !== currentVersion) {
        return true;
      }
    }

    // Check for new announcement
    if (announcement) {
      const lastDismissedAnnouncementId = localStorage.getItem(ANNOUNCEMENT_KEY);
      if (lastDismissedAnnouncementId !== announcement.id) {
        return true;
      }
    }

    return false;
  }, [currentVersion, announcement]);

  /**
   * Handle dismiss action
   */
  const handleDismiss = useCallback(() => {
    if (typeof window === "undefined") return;

    // Save dismiss state
    localStorage.setItem(STORAGE_KEY, "true");

    // Save current version as seen
    if (currentVersion) {
      localStorage.setItem(VERSION_KEY, currentVersion);
    }

    // Save announcement as dismissed
    if (announcement) {
      localStorage.setItem(ANNOUNCEMENT_KEY, announcement.id);
    }

    setIsVisible(false);
    onDismiss?.();
  }, [currentVersion, announcement, onDismiss]);

  // Determine visibility on mount
  useEffect(() => {
    setMounted(true);

    if (isNonProd) {
      // Non-production environments always show the banner
      setIsVisible(true);
    } else {
      // Production: only show if there's new content to display
      setIsVisible(shouldShowInProduction());
    }
  }, [isNonProd, shouldShowInProduction]);

  // Don't render anything until mounted (avoid hydration mismatch)
  if (!mounted) return null;

  // Don't render if not visible
  if (!isVisible) return null;

  // Determine the message to display
  const getMessage = (): string => {
    if (customMessage) return customMessage;

    if (isNonProd) {
      const envMessages: Record<string, string> = {
        demo: "You are using the demo environment. Data may be reset periodically.",
        alpha: "Alpha version - experimental features, may contain bugs.",
        beta: "Beta version - testing phase, please report any issues.",
      };
      return envMessages[environment] || `${styles.label} environment`;
    }

    // Production with new version
    if (currentVersion && localStorage.getItem(VERSION_KEY) !== currentVersion) {
      return `New version ${currentVersion} is now available!`;
    }

    // Production with announcement
    if (announcement) {
      return announcement.message;
    }

    return "";
  };

  const message = getMessage();
  if (!message) return null;

  return (
    <div
      role="banner"
      aria-live="polite"
      className={`
        flex items-center justify-between gap-2 px-3 py-1 mb-2
        ${styles.bgClass} ${styles.borderClass} ${styles.textClass}
        border rounded-lg backdrop-blur-sm
        transition-all duration-200
      `}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Icon size={12} className={`flex-shrink-0 ${styles.iconColor}`} />
        <span className={`text-[10px] font-medium flex-shrink-0 ${styles.iconColor}`}>
          {styles.label}
        </span>
        <span className="text-[10px] truncate">{message}</span>
      </div>

      {/* Only show dismiss button in production environment */}
      {!isNonProd && (
        <button
          onClick={handleDismiss}
          className={`
            tap-target flex items-center justify-center
            p-0.5 rounded transition-colors duration-200
            hover:bg-white/10 active:bg-white/20
            ${styles.iconColor}
          `}
          aria-label="Dismiss banner"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
