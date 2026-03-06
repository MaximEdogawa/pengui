"use client";

/**
 * Hook for fetching and caching ticker icons using TanStack Query
 * Icons are fetched from Space Scan API and cached in memory
 */

import { useQuery } from "@tanstack/react-query";
import { fetchAllTokens } from "@/shared/lib/services/spaceScanService";

const SPACESCAN_KEY = "spacescan";
const ALL_TOKENS_KEY = "all-tokens";

// Cache duration: 24 hours
const ICON_CACHE_TIME = 24 * 60 * 60 * 1000;

/** In browser, serve Space Scan icons via our API so they load in production (avoids referrer/CORS from CDN). */
function toIconUrl(previewUrl: string): string {
  if (typeof window === "undefined") return previewUrl;
  const u = previewUrl.trim();
  if (
    u.startsWith("https://assets.spacescan.io/") ||
    u.startsWith("https://images.spacescan.io/")
  ) {
    return `/api/spacescan/icon?url=${encodeURIComponent(u)}`;
  }
  return u;
}

export interface UseTickerIconResult {
  /** The image URL from Space Scan */
  imageUrl: string | null;
  /** Whether the image is currently loading */
  isLoading: boolean;
  /** Any error that occurred during loading */
  error: Error | null;
}

/**
 * Hook to fetch all token icons from Space Scan (shared query)
 */
function useAllTokenIcons() {
  return useQuery({
    queryKey: [SPACESCAN_KEY, ALL_TOKENS_KEY],
    queryFn: async () => {
      const tokens = await fetchAllTokens();
      const iconMap = new Map<string, string>();
      tokens.forEach((token) => {
        if (token.asset_id && token.preview_url) {
          iconMap.set(token.asset_id, toIconUrl(token.preview_url));
        }
      });
      return iconMap;
    },
    staleTime: ICON_CACHE_TIME,
    gcTime: ICON_CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to get a ticker icon URL with caching via TanStack Query
 * @param assetId - The asset ID of the ticker (null/undefined for XCH)
 * @param enabled - Whether to enable fetching (default: true)
 * @returns Object with imageUrl, isLoading, and error
 */
export function useTickerIcon(
  assetId: string | null | undefined,
  enabled: boolean = true,
): UseTickerIconResult {
  const { data: iconMap, isLoading, error } = useAllTokenIcons();

  return {
    imageUrl: assetId && iconMap ? (iconMap.get(assetId) ?? null) : null,
    isLoading: enabled && isLoading,
    error: error as Error | null,
  };
}
