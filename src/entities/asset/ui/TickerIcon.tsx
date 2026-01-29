"use client";
import TokenIcon, { XchIcon } from "@/shared/ui/icons/TokenIcon";
import { useTickerIcon } from "../hooks/useTickerIcon";

export interface TickerIconProps {
  assetId?: string | null;
  ticker?: string;
  size?: number;
  className?: string;
  showLoadingSkeleton?: boolean;
}

/**
 * TickerIcon - Smart component that fetches and caches token icons
 * Uses the useTickerIcon hook for automatic image fetching with TanStack Query caching
 */
export default function TickerIcon({
  assetId,
  ticker = "",
  size = 28,
  className = "",
  showLoadingSkeleton = true,
}: TickerIconProps) {
  const { imageUrl, isLoading } = useTickerIcon(assetId);

  if (!assetId) {
    return <XchIcon size={size} className={className}/>;
  }

  return (
    <TokenIcon
      imageUrl={imageUrl}
      ticker={ticker}
      size={size}
      className={className}
      isLoading={isLoading && showLoadingSkeleton}
    />
  );
}

export { XchIcon };
