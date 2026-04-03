"use client";

import { useCatTokens } from "@/entities/asset";
import { useMemo } from "react";
import type { AssetPair } from "../lib/orderBookTypes";

/**
 * Returns the top asset pairs sorted by trading volume (target_volume in XCH).
 * Used as default suggestions when no recently used pairs exist.
 */
export function useTopVolumePairs(count: number = 3): AssetPair[] {
  const { tickers } = useCatTokens();

  return useMemo(() => {
    if (!tickers || tickers.length === 0) return [];

    return [...tickers]
      .sort((a, b) => (b.target_volume ?? 0) - (a.target_volume ?? 0))
      .filter((ticker) => ticker.base_code.toLowerCase() !== ticker.target_code.toLowerCase())
      .filter(
        (ticker, index, sorted) =>
          sorted.findIndex(
            (candidate) =>
              candidate.base_code.toLowerCase() === ticker.base_code.toLowerCase() &&
              candidate.target_code.toLowerCase() === ticker.target_code.toLowerCase()
          ) === index
      )
      .slice(0, count)
      .map((t) => ({
        buyAsset: t.base_code,
        sellAsset: t.target_code,
      }));
  }, [tickers, count]);
}
