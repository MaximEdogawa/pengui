"use client";

import { useState, useEffect } from "react";
/**
 * Token Icon Components
 * - TokenIcon: Presentational component (renders icon or fallback)
 * - TokenIconAuto: Self-fetching component using TanStack Query
 * - XchIcon: Special icon for native XCH/TXCH
 *
 * All icon fetching uses TanStack Query for consistent caching across the app
 */

// Generate color from string for fallback
function stringToColor(str: string): string {
  const hash = str
    .split("")
    .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return `hsl(${Math.abs(hash % 360)}, ${65 + (Math.abs(hash >> 8) % 20)}%, ${45 + (Math.abs(hash >> 16) % 15)}%)`;
}

// Common icon container styles
const iconStyle = (size: number): React.CSSProperties => ({
  width: size,
  height: size,
  minWidth: size,
  minHeight: size,
  borderRadius: "50%",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export interface TokenIconProps {
  imageUrl?: string | null;
  ticker?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
}

export interface TokenIconAutoProps {
  assetId: string;
  ticker?: string;
  size?: number;
  className?: string;
}

/**
 * TokenIcon - Presentational component for token icons
 */
export default function TokenIcon({
  imageUrl,
  ticker = "",
  size = 28,
  className = "",
  isLoading = false,
}: TokenIconProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when imageUrl changes
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  // While loading, reserve space but show nothing (no skeleton). Placeholder only on failure.
  if (isLoading) {
    return <div className={className} style={iconStyle(size)} aria-hidden />;
  }

  if (!imageUrl || hasError) {
    const initials = ticker ? ticker.slice(0, 2).toUpperCase() : "?";
    return (
      <div
        className={className}
        style={{
          ...iconStyle(size),
          backgroundColor: ticker ? stringToColor(ticker) : "#6b7280",
          color: "#fff",
          fontSize: Math.max(8, Math.floor(size * 0.45)),
          fontWeight: 600,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={className} style={iconStyle(size)}>
      <img
        src={imageUrl}
        alt={ticker ? `${ticker} icon` : "Token icon"}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/**
 * XchIcon - Native XCH/TXCH icon with Chia leaf
 */
export function XchIcon({
  size = 28,
  className = "",
  isTestnet = false,
}: {
  size?: number;
  className?: string;
  isTestnet?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        ...iconStyle(size),
        backgroundColor: '#000000',
      }}
    >
      <img
        src="/icons/chia-icon.svg"
        alt={isTestnet ? "TXCH" : "XCH"}
        width={size * 0.85}
        height={size * 0.85}
        style={{ width: size * 0.85, height: size * 0.85, objectFit: "contain" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          if (e.currentTarget.parentElement) {
            e.currentTarget.parentElement.textContent = isTestnet ? "TX" : "X";
            e.currentTarget.parentElement.style.color = "#fff";
            e.currentTarget.parentElement.style.fontWeight = "700";
            e.currentTarget.parentElement.style.fontSize = `${Math.floor(size * 0.6)}px`;
          }
        }}
      />
    </div>
  );
}
