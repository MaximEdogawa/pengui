"use client";

/**
 * Ticker icons: one TanStack request for token list, one per icon (via app proxy).
 * Icons are cached and served from memory (object URLs from blob cache).
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllTokens } from "@/shared/lib/services/spaceScanService";
import {
  getSpaceScanIconProxyUrl,
  isSpaceScanIconOrigin,
  isSpaceScanIconProxyUrl,
} from "@/shared/lib/constants/apiProxy";

const SPACESCAN_KEY = "spacescan";
const ALL_TOKENS_KEY = "all-tokens";
const ICON_KEY = "icon";
const ICON_CACHE_TIME = 24 * 60 * 60 * 1000;

function toIconUrl(previewUrl: string): string {
  if (typeof window === "undefined") return previewUrl;
  return isSpaceScanIconOrigin(previewUrl)
    ? getSpaceScanIconProxyUrl(previewUrl)
    : previewUrl.trim();
}

export interface UseTickerIconResult {
  /** Resolved image URL (object URL from cached blob, or raw URL) */
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Single shared query: token list from Space Scan (one request).
 */
function useAllTokenIcons() {
  return useQuery({
    queryKey: [SPACESCAN_KEY, ALL_TOKENS_KEY],
    queryFn: async () => {
      const tokens = await fetchAllTokens();
      const map = new Map<string, string>();
      tokens.forEach((token) => {
        if (token.asset_id && token.preview_url) {
          map.set(token.asset_id, toIconUrl(token.preview_url));
        }
      });
      return map;
    },
    staleTime: ICON_CACHE_TIME,
    gcTime: ICON_CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * One request per icon (proxied URL), cached by TanStack. Returns blob for object URL creation.
 */
function useIconBlob(proxyUrl: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [SPACESCAN_KEY, ICON_KEY, proxyUrl],
    queryFn: async () => {
      if (!proxyUrl) return null;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Icon load failed: ${res.status}`);
      return res.blob();
    },
    enabled: enabled && !!proxyUrl && isSpaceScanIconProxyUrl(proxyUrl),
    staleTime: ICON_CACHE_TIME,
    gcTime: ICON_CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolves icon for an asset: one TanStack request per icon (via proxy), app serves from cache.
 */
export function useTickerIcon(
  assetId: string | null | undefined,
  enabled: boolean = true,
): UseTickerIconResult {
  const { data: iconMap, isLoading: tokensLoading, error: tokensError } = useAllTokenIcons();
  const proxyUrl =
    assetId && iconMap ? (iconMap.get(assetId) ?? null) : null;
  const useBlob = !!proxyUrl && isSpaceScanIconProxyUrl(proxyUrl);
  const { data: blob, isLoading: iconLoading, error: iconError } = useIconBlob(proxyUrl, enabled && !!assetId);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!useBlob || !blob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [useBlob, blob]);

  const isLoading = enabled && (tokensLoading || (useBlob && iconLoading));
  const error = (tokensError ?? iconError) as Error | null;

  const imageUrl: string | null =
    !assetId ? null
    : useBlob ? objectUrl
    : proxyUrl;

  return { imageUrl, isLoading, error };
}
