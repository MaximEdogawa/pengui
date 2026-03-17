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

// In-memory, per-session caches so that:
// - SpaceScan proxy URLs are resolved once per assetId
// - Blob object URLs are created once per proxy URL
const iconProxyUrlCache = new Map<string, string>(); // assetId -> proxy URL
const iconObjectUrlCache = new Map<string, string>(); // proxy URL -> object URL

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
 * Query is keyed by proxyUrl so that multiple assetIds sharing the same icon
 * (same SpaceScan URL) only ever trigger a single fetch and blob in memory.
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
  const {
    data: iconMap,
    isLoading: tokensLoading,
    error: tokensError,
  } = useAllTokenIcons();

  // Resolve proxy URL for this asset from the shared token map, but remember
  // the mapping so subsequent calls for the same assetId don't depend on the
  // query state.
  let proxyUrl: string | null = null;
  if (assetId) {
    // Prefer cached proxy URL if available.
    proxyUrl = iconProxyUrlCache.get(assetId) ?? null;
    if (!proxyUrl && iconMap) {
      const resolved = iconMap.get(assetId) ?? null;
      if (resolved) {
        iconProxyUrlCache.set(assetId, resolved);
        proxyUrl = resolved;
      }
    }
  }

  const useBlob = !!proxyUrl && isSpaceScanIconProxyUrl(proxyUrl);
  const {
    data: blob,
    isLoading: iconLoading,
    error: iconError,
  } = useIconBlob(proxyUrl, enabled && !!assetId);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // For non-blob URLs (non-proxied icons) we don't create object URLs.
    if (!useBlob || !blob || !proxyUrl) {
      setObjectUrl(null);
      return;
    }

    // Reuse a single object URL per proxy URL for the entire session.
    const cached = iconObjectUrlCache.get(proxyUrl);
    if (cached) {
      setObjectUrl(cached);
      return;
    }

    const url = URL.createObjectURL(blob);
    iconObjectUrlCache.set(proxyUrl, url);
    setObjectUrl(url);
    // We intentionally do NOT revoke the object URL here; it is reused for
    // this proxy URL across the app lifetime to avoid churn and duplicate entries.
  }, [useBlob, blob, proxyUrl]);

  const isLoading = enabled && (tokensLoading || (useBlob && iconLoading));
  const error = (tokensError ?? iconError) as Error | null;

  const imageUrl: string | null =
    !assetId ? null : useBlob ? objectUrl : proxyUrl;

  return { imageUrl, isLoading, error };
}
