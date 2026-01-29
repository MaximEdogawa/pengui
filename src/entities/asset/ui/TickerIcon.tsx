'use client'

/**
 * TickerIcon Component (Smart)
 * Wraps the presentational TokenIcon with automatic image fetching and caching.
 * Uses useTickerIcon hook for lazy loading from Space Scan API with TanStack Query caching.
 * 
 * For a simpler presentational component without data fetching,
 * use TokenIcon from @/shared/ui instead.
 */

import TokenIcon, { XchIcon } from '@/shared/ui/icons/TokenIcon'
import { useTickerIcon } from '../model/useTickerIcon'

export interface TickerIconProps {
  /** The asset ID of the ticker (null/undefined for XCH) */
  assetId?: string | null
  /** The ticker symbol (used for fallback text) */
  ticker?: string
  /** Size of the icon in pixels (default: 24) */
  size?: number
  /** Additional CSS classes */
  className?: string
  /** Whether to show a loading skeleton (default: true) */
  showLoadingSkeleton?: boolean
}

/**
 * TickerIcon - Smart component that fetches and caches token icons
 * Uses the useTickerIcon hook for automatic image fetching with TanStack Query caching
 */
export default function TickerIcon({
  assetId,
  ticker = '',
  size = 24,
  className = '',
  showLoadingSkeleton = true,
}: TickerIconProps) {
  const { imageUrl, isLoading } = useTickerIcon(assetId)

  return (
    <TokenIcon
      imageUrl={imageUrl}
      ticker={ticker}
      size={size}
      className={className}
      isLoading={isLoading && showLoadingSkeleton}
    />
  )
}

// Re-export XchIcon from shared for convenience
export { XchIcon }
